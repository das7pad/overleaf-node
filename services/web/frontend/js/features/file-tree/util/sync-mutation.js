import {
  projectJWTDeleteJSON,
  projectJWTPOSTJSON,
} from '../../../infrastructure/jwt-fetch-json'

export function syncRename(projectId, entityType, entityId, newName) {
  return projectJWTPOSTJSON(
    `/project/${projectId}/${getEntityPathName(entityType)}/${entityId}/rename`,
    {
      body: {
        name: newName,
      },
    }
  )
}

export function syncDelete(projectId, entityType, entityId) {
  return projectJWTDeleteJSON(
    `/project/${projectId}/${getEntityPathName(entityType)}/${entityId}`
  )
}

export function syncMove(projectId, entityType, entityId, toFolderId) {
  return projectJWTPOSTJSON(
    `/project/${projectId}/${getEntityPathName(entityType)}/${entityId}/move`,
    {
      body: {
        folder_id: toFolderId,
      },
    }
  )
}

export function syncCreateEntity(projectId, parentFolderId, newEntityData) {
  const { endpoint, ...newEntity } = newEntityData
  return projectJWTPOSTJSON(`/project/${projectId}/${endpoint}`, {
    body: {
      parent_folder_id: parentFolderId,
      ...newEntity,
    },
  })
}

function getEntityPathName(entityType) {
  return entityType === 'fileRef' ? 'file' : entityType
}
