"use strict";

const { resolve } = require("node:path");

const grovePath = resolve(__dirname, "..", "dist");

exports.grovePath = grovePath;
