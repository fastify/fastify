export type DefaultRoute<Request, Reply> = (
  request: Request,
  reply: Reply,
) => void;
