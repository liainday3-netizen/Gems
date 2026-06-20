import { Router, type IRouter } from "express";
import healthRouter from "./health";
import consumerRouter from "./consumer";
import usersRouter from "./users";
import walletsRouter from "./wallets";
import transactionsRouter from "./transactions";
import apiKeysRouter from "./api-keys";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(consumerRouter);
router.use(usersRouter);
router.use(walletsRouter);
router.use(transactionsRouter);
router.use(apiKeysRouter);
router.use(webhooksRouter);

export default router;
