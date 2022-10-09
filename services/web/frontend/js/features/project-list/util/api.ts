import { Tag } from '../../../../../app/src/Features/Tags/types'
import {
  GetProjectsResponseBody,
  Sort,
} from '../../../../../types/project/dashboard/api'
import { deleteJSON, postJSON } from '../../../infrastructure/fetch-json'

export function getProjects(sortBy: Sort): Promise<GetProjectsResponseBody> {
  return postJSON('/api/project', { body: { sort: sortBy } })
}

export function createTag(tagName: string): Promise<Tag> {
  return postJSON(`/api/tag`, {
    body: { name: tagName },
  })
}

export function renameTag(tagId: string, newTagName: string) {
  return postJSON(`/api/tag/${tagId}/rename`, {
    body: { name: newTagName },
  })
}

export function deleteTag(tagId: string) {
  return deleteJSON(`/api/tag/${tagId}`)
}

export function addProjectsToTag(tagId: string, projectIds: string[]) {
  return postJSON(`/api/tag/${tagId}/projects`, {
    body: {
      projectIds,
    },
  })
}

export function removeProjectFromTag(tagId: string, projectId: string) {
  return deleteJSON(`/api/tag/${tagId}/project/${projectId}`)
}

export function removeProjectsFromTag(tagId: string, projectIds: string[]) {
  return deleteJSON(`/api/tag/${tagId}/projects`, {
    body: {
      projectIds,
    },
  })
}

export function archiveProject(projectId: string) {
  return postJSON(`/api/project/${projectId}/archive`)
}

export function deleteProject(projectId: string) {
  return deleteJSON(`/api/project/${projectId}`)
}

export function leaveProject(projectId: string) {
  return postJSON(`/api/project/${projectId}/leave`)
}

export function renameProject(projectId: string, newName: string) {
  return postJSON(`/api/project/${projectId}/rename`, {
    body: {
      newProjectName: newName,
    },
  })
}

export function trashProject(projectId: string) {
  return postJSON(`/api/project/${projectId}/trash`)
}

export function unarchiveProject(projectId: string) {
  return deleteJSON(`/api/project/${projectId}/archive`)
}

export function untrashProject(projectId: string) {
  return deleteJSON(`/api/project/${projectId}/trash`)
}
