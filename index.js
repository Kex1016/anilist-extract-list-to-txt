// import stack
import prompts from "prompts";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// prompt questions, username and type of list (anime/manga)
let questions = [
  {
    type: "text",
    name: "username",
    message: "Enter a username:",
    validate: (value) => {
      if (value.length) {
        return true;
      } else {
        return "Please enter a username";
      }
    },
  },
  {
    type: "select",
    name: "type",
    message: "What type of list do you want to generate?",
    choices: [
      { title: "Anime", value: "ANIME" },
      { title: "Manga", value: "MANGA" },
    ],
  },
];

(async () => {
  // prompt user for username and type of list
  let { username, type } = await prompts(questions);

  // get list of lists from user
  let list = await getList(username, type);

  // get list of titles from user
  let titles = await getTitles(list);

  // write titles to file
  await writeTitles(titles, type.toLowerCase(), username);

  // log success
  console.log(
    chalk.green(
      `\n${
        type[0].toUpperCase() + type.slice(1).toLowerCase()
      } list generated successfully in the following folder: ${chalk.cyan(
        `${__dirname}/${username}_${type.toLowerCase()}/`
      )}`
    )
  );
})();

function getList(username, type) {
  // get list of lists from user
  return new Promise((resolve, reject) => {
    // query for list of lists
    let query = `query {
      MediaListCollection(userName:"${username}", type:${type}) {
        lists {
          entries {
            media {
              title {
                romaji
                english
                native
                userPreferred
              }
            }
          }
          name
          isCustomList
        }
      }
    }`;

    // send query to api
    fetch(`https://graphql.anilist.co`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        // resolve with list of lists
        resolve(res.data.MediaListCollection.lists);
      })
      .catch((err) => {
        // log error
        console.log(chalk.red(err));
        // reject with error
        reject(err);
      });
  });
}

function getTitles(list) {
  // get list from getList
  return new Promise((resolve, reject) => {
    // create array of titles
    let titles = [];

    // loop through list
    list.forEach((list) => {
      let _titles = { name: list.name, entries: [] };
      // loop through entries
      list.entries.forEach((entry) => {
        // push title to titles array
        _titles.entries.push(entry.media.title.userPreferred);
      });
      titles.push(_titles);
    });

    // remove duplicates and sort
    titles = [...new Set(titles)];
    titles.sort();

    resolve(titles);
  });
}

function writeTitles(titles, type, username) {
  // get list from getTitles
  return new Promise((resolve, reject) => {
    // create folder if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, `${username}_${type}`))) {
      fs.mkdirSync(path.join(__dirname, `${username}_${type}`));
    }

    // create files per list
    titles.forEach((title) => {
      // create file
      fs.writeFile(
        path.join(__dirname, `${username}_${type}`, `${title.name}.txt`),
        title.entries.join("\n"),
        (err) => {
          if (err) {
            console.log(chalk.red(err));
            reject(err);
          }
        }
      );
    });

    resolve();
  });
}
