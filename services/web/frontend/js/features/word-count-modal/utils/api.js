import { projectJWTPOSTJSON } from '../../../infrastructure/jwt-fetch-json'

export function fetchWordCount({
  projectId,
  clsiServerId,
  imageName,
  fileName,
  signal,
}) {
  return projectJWTPOSTJSON(`/project/${projectId}/wordcount`, {
    body: {
      clsiServerId,
      imageName,
      fileName,
    },
    signal,
  }).then(data => ({ texcount: data.texcount || data }))
}
