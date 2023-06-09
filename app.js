const express = require("express");
const app = express();
const mongoose = require("mongoose");
const port = 3000;
const Docker = require("dockerode");
const docker = new Docker();
const Item = require("./models/Item");
// const execSync = require('child_process').execSync
mongoose
  .connect("mongodb://mongo:27017/nodemongo", { useNewUrlParser: true })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

// listen to container
app.get("/containers", async (req, res) => {
  try {
    const data = await docker.listContainers({ all: true });
    console.log("list of containers::::");
    console.log(data);
    const containers = data.map((container) => {
      return {
        name: container.Names[0].substring(1),
        state: container.State,
        port: container.Ports.map(
          (p) => `${p.IP}:${p.PrivatePort}->${p.PublicPort}/${p.Type}`
        ).toString(),
        mount: container.Mounts.map(
          (m) => `${m.Source}:${m.Destination}`
        ).toString(),
      };
    });
    res.render("containers", { containers });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// get items list display at home page
app.get("/", (req, res) => {
  Item.find()
    .sort({ date: -1 })
    .then((items) => res.render("home", { items }))
    .catch((err) => res.status(404).json({ msg: "No items found" }));
});

// add item to the item list
app.post("/item/add", (req, res) => {
  const newItem = new Item({
    name: req.body.name,
    description: req.body.description,
  });
  if (!newItem.name) {
    return res.send(
      "<script>alert('Please enter an item name'); window.location.href='/';</script>"
    );
  }
  newItem.save().then((item) => res.redirect("/"));
});

// get item by id
app.get("/item/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).exec();
    if (!item) {
      res.status(404).send("Item not found");
    } else {
      res.render("item", { item });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// delete item by id
app.delete("/item/:id/delete", (req, res) => {
  Item.findByIdAndRemove(req.params.id)
    .then(() => res.redirect("/"))
    .catch((err) => console.log(err));
});

// connect to db
app.post("/containers/connect", async (req, res) => {
  try {
    const containerId = await getContainerID();
    const container = docker.getContainer(containerId);
    container.start();
    console.log("container started successfully");
  } catch (err) {
    return res.send(
      "<script>alert('MongoDB is already running'); window.location.href='/';</script>"
    );
  }
});
// turn off db

app.post("/containers/disconnect", async (req, res) => {
  console.log("trying to disconnect");
  try {
    const containerId = await getContainerID();
    const container = docker.getContainer(containerId);
    container.stop();
    console.log("container stopped successfully");
    return res.redirect("/containers");
  } catch (err) {
    return res.send(
      "<script>alert('MongoDB is already disconnected'); window.location.href='/';</script>"
    );
  }
});

async function getContainerID() {
  const containerList = await docker.listContainers({ all: true });
  for (let container of containerList) {
    if (container.Image === "mongo") {
      return container.Id;
    }
  }
}

app.listen(port, () => console.log("Server running..."));
module.exports = app;
