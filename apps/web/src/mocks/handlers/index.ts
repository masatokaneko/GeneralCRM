// Export all MSW handlers

import { accountHandlers } from "./accounts";
import { contactHandlers } from "./contacts";
import { leadHandlers } from "./leads";
import { opportunityHandlers } from "./opportunities";
import { opportunityContactRoleHandlers } from "./opportunityContactRoles";
import { quoteHandlers } from "./quotes";
import { campaignHandlers } from "./campaigns";
import { workflowHandlers } from "./workflows";
import { approvalProcessHandlers } from "./approvalProcesses";
import { territoryHandlers } from "./territories";
import { authHandlers, metadataHandlers } from "./auth";
import { miscHandlers } from "./misc";

export const handlers = [
  ...authHandlers,
  ...metadataHandlers,
  ...accountHandlers,
  ...contactHandlers,
  ...leadHandlers,
  ...opportunityHandlers,
  ...opportunityContactRoleHandlers,
  ...quoteHandlers,
  ...campaignHandlers,
  ...workflowHandlers,
  ...approvalProcessHandlers,
  ...territoryHandlers,
  ...miscHandlers,
];
