import type { APIRoute } from "astro";
import { getContentResponse } from "../../../lib/content-response";

export const GET: APIRoute = async () => {
  return getContentResponse();
};
