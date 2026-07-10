import { Request, Response, NextFunction } from "express";

/**
 * Create mock Express req/res/next for testing middleware.
 */
export const createMockReq = (overrides: Partial<Request> = {} as any) => {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    user: undefined,
    ...overrides,
  } as any;
};

export const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
    send(data: any) {
      res.body = data;
      return res;
    },
  } as any;
  return res as Response;
};

export const createMockNext = (): NextFunction & {
  called: boolean;
  calledWith?: any;
} => {
  const next = ((err?: any) => {
    (next as any).called = true;
    (next as any).calledWith = err;
  }) as any;
  next.called = false;
  next.calledWith = undefined;
  return next;
};
