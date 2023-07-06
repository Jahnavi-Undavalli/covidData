const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const databasePath = path.join(__dirname, "covid19IndiaPortal.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const authentication = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "jahnavi", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

app.get("/states/", async (request, response) => {
  const getMoviesQuery = `
    SELECT
      *
    FROM
      state;`;
  const moviesArray = await database.all(getMoviesQuery);
  response.send(
    moviesArray.map((eachPlayer) =>
      convertStateDbObjectToResponseObject(eachPlayer)
    )
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getMovieQuery = `
    SELECT 
      *
    FROM 
      state
    WHERE 
      state_id = ${stateId};`;
  const movie = await database.get(getMovieQuery);
  response.send(convertStateDbObjectToResponseObject(movie));
});

app.post("/districts/", authentication, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postMovieQuery = `
  INSERT INTO
    district ( district_name,state_id,cases,cured,active,deaths)
  VALUES
    (${districtName}, '${stateId}', '${cases}','${cured}', '${active}', '${deaths}');`;
  await database.run(postMovieQuery);
  response.send("District Successfully Added");
});

app.get(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const getMovieQuery = `
    SELECT 
      *
    FROM 
      district
    WHERE 
      district_id = ${districtId};`;
    const movie = await database.get(getMovieQuery);
    response.send(convertDistrictDbObjectToResponseObject(movie));
  }
);

app.delete(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteMovieQuery = `
  DELETE FROM
    district
  WHERE
    district_id = ${districtId};`;
    await database.run(deleteMovieQuery);
    response.send(`District Removed`);
  }
);

app.put(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const { districtId } = request.params;
    const updateMovieQuery = `
            UPDATE
              district
            SET
              district_name = ${districtName},
              state_id = '${stateId}',
              cases = '${cases}',
              cured = '${cured}',
              active = '${active}',
              deaths = '${deaths}'
            WHERE
              district_id = ${districtId};`;

    await database.run(updateMovieQuery);
    response.send("District Details Updated");
  }
);

app.get(
  "/states/:stateId/stats/",
  authentication,
  async (request, response) => {
    const { stateId } = request.params;
    const getMovieQuery = `
    SELECT 
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM 
      district
    WHERE 
      state_id = ${stateId};`;

    const stats = await database.get(getMovieQuery);
    console.log(stats);
    response.send({
      totalCases: stats["SUM(cases)"],
      totalCured: stats["SUM(cured)"],
      totalActive: stats["SUM(active)"],
      totalDeaths: stats["SUM(deaths)"],
    });
  }
);

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getMoviesQuery = `
    SELECT
      state_name
    FROM
      district
      natural join state
      WHERE 
       district_id = ${districtId};`;
  const moviesArray = await database.all(getMoviesQuery);
  console.log(moviesArray);
  response.send(
    moviesArray.map((eachMovie) => ({ stateName: eachMovie.state_name }))
  );
});

app.post("/login/", authentication, async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `select * from user where username='${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "jahnavi");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

module.exports = app;
