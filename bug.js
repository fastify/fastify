const fastify = require('.');

const app = fastify();

let request;

app.decorateRequest('user')

app.addHook('preHandler', (req, reply, done) => {
  if (Math.random() > 0.5) {
    req.user = 'User';
  }
  done();
});

app.get('/', (req, reply) => {
  const isSame = request ? %HaveSameMap(request, req) : null;

  request = req;
  console.log(isSame);
  reply.send(String(isSame));
});

app.listen(3000, (err, address) => {
  console.log(`Running on ${address}`);
});
