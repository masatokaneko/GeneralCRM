import { http, HttpResponse, delay } from "msw";

// Stub handlers for entities not yet fully implemented in mock DB
// These return empty responses to prevent 404 errors

export const miscHandlers = [
  // Opportunity Line Items
  http.get("/v1/opportunities/:id/line-items", async () => {
    await delay(50);
    return HttpResponse.json({
      records: [],
      totalSize: 0,
    });
  }),

  // Pricebook Entries
  http.get("/v1/pricebook-entries", async () => {
    await delay(50);
    return HttpResponse.json({
      records: [],
      totalSize: 0,
    });
  }),

  http.get("/v1/pricebook-entries/:id", async () => {
    await delay(50);
    return HttpResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Pricebook entry not found",
        },
      },
      { status: 404 }
    );
  }),

  // Orders
  http.get("/v1/orders", async () => {
    await delay(50);
    return HttpResponse.json({
      records: [],
      totalSize: 0,
    });
  }),

  http.get("/v1/orders/:id", async () => {
    await delay(50);
    return HttpResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Order not found",
        },
      },
      { status: 404 }
    );
  }),

  // Tasks
  http.get("/v1/tasks", async () => {
    await delay(50);
    return HttpResponse.json({
      records: [],
      totalSize: 0,
    });
  }),

  http.get("/v1/tasks/:id", async () => {
    await delay(50);
    return HttpResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Task not found",
        },
      },
      { status: 404 }
    );
  }),

  // Events
  http.get("/v1/events", async () => {
    await delay(50);
    return HttpResponse.json({
      records: [],
      totalSize: 0,
    });
  }),

  http.get("/v1/events/:id", async () => {
    await delay(50);
    return HttpResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Event not found",
        },
      },
      { status: 404 }
    );
  }),

  // Products
  http.get("/v1/products", async () => {
    await delay(50);
    return HttpResponse.json({
      records: [],
      totalSize: 0,
    });
  }),

  http.get("/v1/products/:id", async () => {
    await delay(50);
    return HttpResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Product not found",
        },
      },
      { status: 404 }
    );
  }),

  // Pricebooks
  http.get("/v1/pricebooks", async () => {
    await delay(50);
    return HttpResponse.json({
      records: [],
      totalSize: 0,
    });
  }),

  http.get("/v1/pricebooks/:id", async () => {
    await delay(50);
    return HttpResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Pricebook not found",
        },
      },
      { status: 404 }
    );
  }),

  // Contracts
  http.get("/v1/contracts", async () => {
    await delay(50);
    return HttpResponse.json({
      records: [],
      totalSize: 0,
    });
  }),

  http.get("/v1/contracts/:id", async () => {
    await delay(50);
    return HttpResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Contract not found",
        },
      },
      { status: 404 }
    );
  }),

  // Invoices
  http.get("/v1/invoices", async () => {
    await delay(50);
    return HttpResponse.json({
      records: [],
      totalSize: 0,
    });
  }),

  http.get("/v1/invoices/:id", async () => {
    await delay(50);
    return HttpResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Invoice not found",
        },
      },
      { status: 404 }
    );
  }),
];
