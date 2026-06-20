import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import walletsRouter from "./wallets";
import transactionsRouter from "./transactions";
import apiKeysRouter from "./api-keys";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(walletsRouter);
router.use(transactionsRouter);
router.use(apiKeysRouter);

export default router;
