import { test, expect, APIRequestContext, Page } from "@playwright/test";
import tags from "./test-data/tags.json";
import mockArticle from "./test-data/first-article-updated.json";
import newArticle from "./test-data/first-article-new.json";

test.describe("Some initial API tests", () => {
  test.beforeEach(async ({ page }) => {
    // create a mock implementation for the API
    await page.route("*/**/api/tags", async (route) => {
      await route.fulfill({
        body: JSON.stringify(tags), // get the tags from the JSON file
      });
    });
    // open site in browser
    await page.goto("https://angular.realworld.how");
  });

  test("has title", async ({ page }) => {
    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Conduit/);
  });

  test("can intercept API response and manipulate it's content", async ({
    page,
  }) => {
    // intercept the API response
    await page.route("*/**/api/articles*", async (route) => {
      // fetch data from API
      const response = await route.fetch();
      const body = await response.json();
      body.articles[0].title = mockArticle.title;
      body.articles[0].description = mockArticle.description;
      body.articles[0].body = mockArticle.body;
      await route.fulfill({
        body: JSON.stringify(body), // get the manipulated / mocked body from above
      });
    });
    // click tab to trigger a page refresh
    await page.getByText("Global Feed").click();
    // Varify mocked article data
    await expect(page.locator("app-article-list h1").first()).toContainText(
      mockArticle.title,
    );
    await expect(page.locator("app-article-list p").first()).toContainText(
      mockArticle.description,
    );
  });
});

test.describe("Perform CRUD operations on articles", () => {
  // let token: string;

  test.beforeEach(async ({ page, request }) => {
    // open site in browser
    await page.goto("https://angular.realworld.how");
    // // login
    // await loginViaUI(page);
    // // store token
    // token = await loginViaAPI(request, "hansi@horsti.de", "Hansi123");
  });

  test("Delete an article", async ({ page, request }) => {
    // (1) create a new article
    const response = await createArticleViaAPI(request, newArticle);
    expect(response.status()).toEqual(201);
    // (2) locate the newly created article on the page
    await page.getByText("Global Feed").click(); // refresh page
    const article = page.getByText(newArticle.title);
    const count = await article.count();
    // if (count > 0) {
    await article.click();
    // (3) delete article
    await page.getByRole("button", { name: "Delete Article" }).first().click();
    // }
    // (4) refresh the page again
    await page.getByText("Global Feed").click(); // refresh page
    // (5) assert that article has been deleted
    await expect(page.locator("app-article-list h1").first()).not.toContainText(
      newArticle.title,
    );
  });

  test("Create a new article", async ({ page, request }) => {
    // click new article button
    await page.getByText("New Article").click();
    // fill input fields
    await page
      .getByRole("textbox", { name: "Article Title" })
      .fill(newArticle.title);
    await page
      .getByRole("textbox", { name: "What's this article about?" })
      .fill(newArticle.description);
    await page
      .getByRole("textbox", { name: "Write your article (in markdown)" })
      .fill(newArticle.body);
    // click publish button
    await page.getByRole("button", { name: "Publish Article" }).click();
    // intercept the API call
    const response = await page.waitForResponse(
      "https://api.realworld.io/api/articles/",
    );
    const body = await response.json();
    const slug = body.article.slug;
    // assert that creation worked
    await expect(page.locator("app-article-page h1")).toContainText(
      newArticle.title,
    );
    await page.getByText("Home").click();
    await page.getByText("Global Feed").click();
    await expect(page.locator("app-article-list h1").first()).toContainText(
      newArticle.title,
    );
    // delete article via API
    const deletion = await deleteArticleViaAPI(request, slug);
    expect(deletion.status()).toEqual(204);
  });

  const loginViaAPI = async (
    request: APIRequestContext,
    email: string,
    password: string,
  ): Promise<string> => {
    const response = await request.post(
      "https://api.realworld.io/api/users/login",
      {
        data: {
          user: {
            email,
            password,
          },
        },
      },
    );
    const body = await response.json();
    return body?.user?.token || "";
  };

  const createArticleViaAPI = async (
    request: APIRequestContext,
    article: any,
  ): Promise<any> => {
    return request.post("https://api.realworld.io/api/articles/", {
      data: {
        article,
      },
      // headers: {
      //   Authorization: `Token ${token}`,
      // },
    });
  };

  const deleteArticleViaAPI = async (
    request: APIRequestContext,
    slug: string,
  ): Promise<any> => {
    return request.delete(
      `https://api.realworld.io/api/articles/${slug}`,
      // {
      // headers: {
      //   Authorization: `Token ${token}`,
      // },
      // }
    );
  };

  const loginViaUI = async (page: Page): Promise<any> => {
    // click login button
    await page.getByText("Sign in").click();
    // fill email and password fields
    await page.getByRole("textbox", { name: "Email" }).fill("hansi@horsti.de");
    await page.getByRole("textbox", { name: "Password" }).fill("Hansi123");
    await page.getByRole("button", { name: "Sign in" }).click();
  };
});
