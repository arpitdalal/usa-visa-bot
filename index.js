require("dotenv").config();
const nodemailer = require("nodemailer");
const request = require("request");
const puppeteer = require("puppeteer");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const User = require("./models/user");

try {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "MongoDB connection error: "));
  db.once("open", function () {
    console.log("Connected successfully");
  });
} catch (error) {
  console.error(`MongoDB connection error: ${error}`);
  throw error;
}

const transporter = nodemailer.createTransport(
  `smtps://${process.env.NODEMAILER_USER}:${process.env.NODEMAILER_PASSWORD}@${process.env.NODEMAILER_HOST}`,
);
const cronJobApiBaseUrl = "https://api.cron-job.org/";

// express server
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/signup", async (req, res) => {
  try {
    const { email, password, username, date } = req.body;

    if (!email || !password || !username || !date) {
      return res.status(400).send({
        message: "Error: All the fields are necessary",
      });
    }
    if (isInThePast(date)) {
      return res.status(400).send({
        message: "Error: Please select a future desired date",
      });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).send({
        message: "Error: Notification to this email already exists",
      });
    }

    const minutes = generateMinutes();

    request(
      {
        uri: `${cronJobApiBaseUrl}jobs`,
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_JOB_API_KEY}`,
        },
        json: {
          job: {
            url: `${process.env.RUN_JOB_URL}?email=${email}`,
            title: `USA visa date for ${email}`,
            enabled: "true",
            saveResponses: "true",
            schedule: {
              timezone: "America/Toronto",
              hours: [-1],
              mdays: [-1],
              minutes,
              months: [-1],
              wdays: [-1],
            },
            notification: {
              onFailure: "true",
              onSuccess: "true",
              onDisable: "true",
            },
          },
        },
      },
      async (err, _, body) => {
        if (err) {
          return res.status(500).send({
            message: "Error: Signup failed",
          });
        } else {
          const { jobId } = body;
          const newUser = new User({ ...req.body, jobId });
          await newUser.save();

          return res.status(200).send({
            message: "Signup successful",
          });
        }
      },
    );
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      message: "Error: Signup failed",
    });
  }
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  User.findOne({ username, password }, (err, user) => {
    if (err) {
      res.status(500).send({
        ok: false,
        message: "Login failed",
      });
    } else if (!user) {
      res.status(400).send({
        ok: false,
        message: "Login failed",
      });
    } else {
      res.status(200).send({
        ok: true,
        message: JSON.stringify({
          username: user.username,
          password: user.password,
          email: user.email,
          date: user.date,
        }),
      });
    }
  });
});

app.get("/run-job", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).send({
        message: "Error: Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({
        message: "Error: User with this email does not exist",
      });
    }

    return await runJob(res, user);
  } catch (error) {
    res.status(500).send({
      message: "Server Error: Something went wrong",
    });
    process.exit(1);
  }
});
const PORT = process.env.PORT || 3000;
app.set("port", PORT);

app
  .listen(PORT, () => {
    console.log("http://localhost:3000");
  })
  .on("error", (err) => {
    console.log(err);
  });

async function runJob(res, user) {
  try {
    const { email, username, password, date, jobId } = user;
    let { calgary, halifax, montreal, ottawa, quebec, toronto, vancouver } =
      await getAvailableDates(username, password);

    if (date) {
      const desiredDate = new Date(new Date(date).toLocaleString("en-US"));

      // if (isTomorrow(desiredDate)) {
      //   console.log("LOG: desired date is tomorrow");
      //   const messageOptions = {
      //     from: "arpitdalalm@gmail.com",
      //     to: email,
      //     subject: "Notice from USA visa notification service",
      //     html: `<h3><strong>Note: Your desired date is ${date}, which means the notification service will end from tomorrow.</strong></h3><br><br><strong>What now?<br>Don't worry, you can edit your current profile to remove the date to get all available dates or change the current desired date to a future date.</strong><br><br><p>To edit your profile go to <a href="http://usa-visa.herokuapp.com/profile">Your Profile</a></p>`,
      //   };
      //   transporter.sendMail(messageOptions, (err) => {
      //     if (err) {
      //       console.log(err);
      //     }
      //   });
      // }

      // if (isInThePast(desiredDate)) {
      //   console.log("LOG: desired date is gone");
      //   const messageOptions = {
      //     from: "arpitdalalm@gmail.com",
      //     to: email,
      //     subject: "Notice from USA visa notification service",
      //     html: `<h3><strong>Note: notification service has been cancelled since your desired date is in the past.</strong></h3><br><br><p>You can edit the desired date to a future date or remove it completely to get notification for every date available. To edit your profile go to <a href="http://usa-visa.herokuapp.com/profile">Your Profile</a></p>`,
      //   };
      //   transporter.sendMail(messageOptions, (err) => {
      //     if (err) {
      //       console.log(err);
      //     } else {
      //       request(
      //         {
      //           uri: `${cronJobApiBaseUrl}jobs/${jobId}`,
      //           method: "PATCH",
      //           headers: {
      //             "Content-Type": "application/json",
      //             Authorization: `Bearer ${process.env.CRON_JOB_API_KEY}`,
      //           },
      //           json: {
      //             job: {
      //               enabled: false,
      //             },
      //           },
      //         },
      //         async (err, _, body) => {
      //           console.log(`LOG: delete request sent`);
      //           if (err) {
      //             console.log("error", err);
      //             const messageOptions = {
      //               from: "arpitdalalm@gmail.com",
      //               to: "arpitdalalm@gmail",
      //               subject: "ERROR: USA visa notification service",
      //               html: `Deleting ${jobId} failed. Error: ${err}`,
      //             };
      //             transporter.sendMail(messageOptions, (err) => {
      //               if (err) {
      //                 console.log(`Error sending email: ${err}`);
      //               }
      //             });
      //           }
      //           if (!err) {
      //             console.log("LOG: Delete request successful", body);
      //           }
      //         },
      //       );
      //     }
      //   });
      // }

      toronto.map((tempDate) => {
        if (
          !(new Date(new Date(tempDate).toLocaleString("en-US")) < desiredDate)
        ) {
          toronto = [];
        }
      });
      vancouver.map((tempDate) => {
        if (
          !(new Date(new Date(tempDate).toLocaleString("en-US")) < desiredDate)
        ) {
          vancouver = [];
        }
      });
      quebec.map((tempDate) => {
        if (
          !(new Date(new Date(tempDate).toLocaleString("en-US")) < desiredDate)
        ) {
          quebec = [];
        }
      });
      ottawa.map((tempDate) => {
        if (
          !(new Date(new Date(tempDate).toLocaleString("en-US")) < desiredDate)
        ) {
          ottawa = [];
        }
      });
      montreal.map((tempDate) => {
        if (
          !(new Date(new Date(tempDate).toLocaleString("en-US")) < desiredDate)
        ) {
          montreal = [];
        }
      });
      halifax.map((tempDate) => {
        if (
          !(new Date(new Date(tempDate).toLocaleString("en-US")) < desiredDate)
        ) {
          halifax = [];
        }
      });
      calgary.map((tempDate) => {
        if (
          !(new Date(new Date(tempDate).toLocaleString("en-US")) < desiredDate)
        ) {
          calgary = [];
        }
      });
    }

    if (
      !toronto.length > 0 &&
      !vancouver.length > 0 &&
      !ottawa.length > 0 &&
      !quebec.length > 0 &&
      !montreal.length > 0 &&
      !halifax.length > 0 &&
      !calgary.length > 0
    ) {
      return res.status(200).send("No dates available");
    }

    const message = createMessage(
      toronto,
      calgary,
      halifax,
      montreal,
      ottawa,
      quebec,
      vancouver,
    );

    return await sendEmail(message, email)
      .then(() => {
        return res.status(200).send("Notification sent");
      })
      .catch((error) => {
        // SEND AN EMAIL ABOUT THE ERROR TO ARPITDALALM@GMAIL.COM
        const messageOptions = {
          from: "arpitdalalm@gmail.com",
          to: "arpitdalalm@gmail.com",
          subject: "ERROR MESSAGE FROM US VISA BOT",
          text: `Couldn't send the the notification to the channel! ERROR: ${error}!`,
        };
        transporter.sendMail(messageOptions, (err) => {
          if (err) {
            console.log(`Email error: ${err}`);
          }
        });
        return res.status(400).send(`Error: ${error}`);
      });
  } catch (error) {
    throw error;
  }
}

function createMessage(
  toronto,
  calgary,
  halifax,
  montreal,
  ottawa,
  quebec,
  vancouver,
) {
  let message = "<strong>📅 Available USA B1/B2 visa dates are: </strong>";
  if (toronto.length > 0) {
    message += `<br><br><strong>Toronto</strong><br>${toronto
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  if (calgary.length > 0) {
    message += `<br><br><strong>Calgary</strong><br>${calgary
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  if (halifax.length > 0) {
    message += `<br><br><strong>Halifax</strong><br>${halifax
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  if (montreal.length > 0) {
    message += `<br><br><strong>Montreal</strong><br>${montreal
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  if (ottawa.length > 0) {
    message += `<br><br><strong>Ottawa</strong><br>${ottawa
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  if (quebec.length > 0) {
    message += `<br><br><strong>Quebec</strong><br>${quebec
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  if (vancouver.length > 0) {
    message += `<br><br><strong>Vancouver</strong><br>${vancouver
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  return message;
}

function sendEmail(message, email) {
  return new Promise((resolve, reject) => {
    try {
      const messageOptions = {
        from: "arpitdalalm@gmail.com",
        to: email,
        subject: "Available USA B1/B2 visa dates",
        html: message,
      };
      transporter.sendMail(messageOptions, (err) => {
        if (err) {
          console.log(`Email error: ${err}`);
          reject(err);
        }
      });
      resolve("done!");
    } catch (error) {
      reject(error);
    }
  });
}

function sendNotification(message) {
  return new Promise((resolve, reject) => {
    try {
      const data = {
        chat_id: process.env.TELEGRAM_GROUP_ID_US,
        parse_mode: "HTML",
        text: message,
      };

      request(
        {
          uri: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN_US}/sendMessage`,
          method: "POST",
          json: data,
        },
        (err) => {
          if (!err) {
            resolve("done!");
          } else {
            console.error(err);
            reject(err);
          }
        },
      );
    } catch (err) {
      reject(err);
    }
  });
}

async function getAvailableDates(username, password) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto("https://ais.usvisa-info.com/en-ca/niv/users/sign_in");
    await page.waitForSelector("#user_email");
    await page.waitForSelector("#user_password");
    await page.waitForSelector("#policy_confirmed");
    await page.type("#user_email", username);
    await page.type("#user_password", password);
    await page.evaluate(() => {
      document.querySelector("#policy_confirmed").click();
    });
    await page.evaluate(() => {
      document.querySelector("input[type='submit']").click();
    });
    await page.waitForSelector("[role='menuitem'] > .button.primary.small");
    await page.evaluate(() => {
      document
        .querySelector("[role='menuitem'] > .button.primary.small")
        .click();
    });
    await page.waitForSelector("#main");
    const url = page.url();
    const id = url.replace(/\D/g, "");

    // Calgary
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/89.json?appointments[expedite]=false`,
    );
    await page.waitForSelector("body > pre");
    const calData = await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      });
    const calJson = JSON.parse(calData);
    let calgary = calJson.map((item) => item.date);

    // Halifax
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/90.json?appointments[expedite]=false`,
    );
    await page.waitForSelector("body > pre");
    const halData = await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      });
    const halJson = JSON.parse(halData);
    let halifax = halJson.map((item) => item.date);

    // Montreal
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/91.json?appointments[expedite]=false`,
    );
    await page.waitForSelector("body > pre");
    const monData = await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      });
    const monJson = JSON.parse(monData);
    let montreal = monJson.map((item) => item.date);

    // Ottawa
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/92.json?appointments[expedite]=false`,
    );
    await page.waitForSelector("body > pre");
    const ottData = await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      });
    const ottJson = JSON.parse(ottData);
    let ottawa = ottJson.map((item) => item.date);

    // Quebec
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/93.json?appointments[expedite]=false`,
    );
    await page.waitForSelector("body > pre");
    const queData = await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      });
    const queJson = JSON.parse(queData);
    let quebec = queJson.map((item) => item.date);

    // Toronto
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/94.json?appointments[expedite]=false`,
    );
    await page.waitForSelector("body > pre");
    const torData = await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      });
    const torJson = JSON.parse(torData);
    let toronto = torJson.map((item) => item.date);

    // Vancouver
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/95.json?appointments[expedite]=false`,
    );
    await page.waitForSelector("body > pre");
    const vanData = await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      });
    const vanJson = JSON.parse(vanData);
    let vancouver = vanJson.map((item) => item.date);

    await browser.close();

    return {
      calgary,
      halifax,
      montreal,
      ottawa,
      quebec,
      toronto,
      vancouver,
    };
  } catch (error) {
    console.error(`Puppeteer error: ${error}`);
    throw error;
  }
}

function getTomorrowDate() {
  const today = new Date().toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  let dd = new Date(today).getDate() + 1;
  let mm = new Date(today).getMonth() + 1;
  let yyyy = new Date(today).getFullYear();
  if (dd < 10) {
    dd = "0" + dd;
  }
  if (mm < 10) {
    mm = "0" + mm;
  }

  return `${yyyy}-${mm}-${dd}`;
}

function isTomorrow(date) {
  const tomorrow = new Date(new Date().toLocaleString("en-US"));
  tomorrow.setDate(tomorrow.getDate() + 1);

  const desiredDate = new Date(new Date(date).toLocaleString("en-US"));

  // 👇️ Tomorrow's date
  console.log(tomorrow);

  if (tomorrow.toDateString() === desiredDate.toDateString()) {
    return true;
  }

  return false;
}

function isInTheFuture(date) {
  const today = new Date(new Date().toLocaleString("en-US"));
  const desiredDate = new Date(new Date(date).toLocaleString("en-us"));

  // 👇️ OPTIONAL!
  // This line sets the time of the current date to the
  // last millisecond, so the comparison returns `true` only if
  // date is at least tomorrow
  today.setHours(23, 59, 59, 998);

  return desiredDate > today;
}

function isInThePast(date) {
  const today = new Date(new Date().toLocaleString("en-US"));
  const desiredDate = new Date(new Date(date).toLocaleString("en-us"));

  // 👇️ OPTIONAL!
  // This line sets the hour of the current date to midnight
  // so the comparison only returns `true` if the passed in date
  // is at least yesterday
  today.setHours(0, 0, 0, 0);

  return desiredDate < today;
}

function getRandomNumber(max, min) {
  return Math.round(Math.random() * (max - min)) + min;
}

function generateMinutes() {
  const minute = getRandomNumber(0, 5);
  let currentMinute = minute;
  let minutes = [currentMinute];

  for (let i = 0; i < 3; i++) {
    currentMinute += 15;
    minutes.push(currentMinute);
  }

  return minutes;
}
