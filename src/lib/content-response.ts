import { getContentPayload } from "./content-payload";

const CONTENT_TYPE_JSON_UTF8 = "application/json; charset=utf-8";

export const getContentResponse = async () =>
  new Response(JSON.stringify(await getContentPayload()), {
    headers: {
      "Content-Type": CONTENT_TYPE_JSON_UTF8,
    },
  });
