import fetch from "node-fetch";
import { HttpError } from "./errors";

const adminUrl = (options: ShopifyPluginOptions) =>
  `https://@${options.storeUrl}/api/2022-07/graphql.json`;

const MAX_BACKOFF_MILLISECONDS = 60000;

export function createClient(options: ShopifyPluginOptions) {
  const url = adminUrl(options);

  async function graphqlFetch<T>(
    query: string,
    variables?: Record<string, any>,
    retries = 0
  ): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/graphql",
        "X-Shopify-Storefront-Access-Token": options.password,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const waitTime = 2 ** (retries + 1) + 500;
      if (response.status >= 500 && waitTime < MAX_BACKOFF_MILLISECONDS) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return graphqlFetch(query, variables, retries + 1);
      }

      throw new HttpError(response);
    }

    const json = await response.json();
    return json.data as T;
  }

  return { request: graphqlFetch };
}
