import { Router }
from "express";

import {
  createSaving
}
from "../controllers/savings.controller.js";

import {
  protect
}
from "../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  protect,
  createSaving
);

export default router;