import { projectJWTPOSTJSON } from '../../../infrastructure/jwt-fetch-json'

export const refreshProjectMetadata = (projectId, entityId) =>
  projectJWTPOSTJSON(`/project/${projectId}/doc/${entityId}/metadata`)
