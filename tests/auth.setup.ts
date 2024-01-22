import { APIRequestContext, Page, test as setup } from "@playwright/test";
import credentials from "../.auth/creds.json";
import fs from "fs";

const authFile = ".auth/creds.json";

setup("Authentication", async ({ page, request }) => {
  await page.goto("https://angular.realworld.how");
  await loginViaAPI(request, "hansi@horsti.de", "Hansi123");
});

const loginViaAPI = async (
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<any> => {
  const response = await request.post(
    "https://api.realworld.io/api/users/login",
    {
      data: {
        user: { email, password },
      },
    },
  );
  // store credentials in file
  const body = await response.json();
  const token = body?.user?.token || "";
  credentials.origins[0].localStorage[0].value = token;
  fs.writeFileSync(authFile, JSON.stringify(credentials));
  // store token in env variable
  process.env["ACCESS_TOKEN"] = token;
};

const loginViaUI = async (page: Page): Promise<any> => {
  // click login button
  await page.getByText("Sign in").click();
  // fill email and password fields
  await page.getByRole("textbox", { name: "Email" }).fill("hansi@horsti.de");
  await page.getByRole("textbox", { name: "Password" }).fill("Hansi123");
  await page.getByRole("button", { name: "Sign in" }).click();

  // make sure the page is loaded - wait for something
  await page.waitForResponse("https://api.realworld.io/api/tags");

  // store context in .auth
  await page.context().storageState({ path: authFile });
};
