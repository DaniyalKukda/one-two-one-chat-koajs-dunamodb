import koa from 'koa';
import defaultConfig from './environment.json'
import { connectWithSocket, registerSocketRoutes } from './socket/socket'
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { initDynamoDB } from './aws';

let app = new koa();
const port = (process.env.PORT || defaultConfig.port) + ""

app.use(cors());
app.use(bodyParser());

app.use(registerSocketRoutes().routes());
app.use(registerSocketRoutes().allowedMethods());

connectWithSocket(app.callback()).listen(parseInt(port), async ()=> {
  await initDynamoDB();
  console.log("Listening at port ", port);
});