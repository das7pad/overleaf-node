import {
  projectJWTDeleteJSON,
  projectJWTGetJSON,
  projectJWTPOSTJSON,
  projectJWTPutJSON,
} from '../../../infrastructure/jwt-fetch-json'

export function sendInvite(projectId, email, privileges) {
  return projectJWTPOSTJSON(`/project/${projectId}/invite`, {
    body: {
      email,
      privileges,
    },
  })
}

export function resendInvite(projectId, invite) {
  return projectJWTPOSTJSON(`/project/${projectId}/invite/${invite._id}/resend`)
}

export function revokeInvite(projectId, invite) {
  return projectJWTDeleteJSON(`/project/${projectId}/invite/${invite._id}`)
}

export function updateMember(projectId, member, data) {
  return projectJWTPutJSON(`/project/${projectId}/users/${member._id}`, {
    body: data,
  })
}

export function removeMemberFromProject(projectId, member) {
  return projectJWTDeleteJSON(`/project/${projectId}/users/${member._id}`)
}

export function transferProjectOwnership(projectId, member) {
  return projectJWTPOSTJSON(`/project/${projectId}/transfer-ownership`, {
    body: {
      user_id: member._id,
    },
  })
}

export function setProjectAccessLevel(projectId, publicAccessLevel) {
  return projectJWTPutJSON(
    `/project/${projectId}/settings/admin/publicAccessLevel`,
    { body: { publicAccessLevel } }
  )
}

export function listProjectMembers(projectId) {
  return projectJWTGetJSON(`/project/${projectId}/members`)
}

export function listProjectInvites(projectId) {
  return projectJWTGetJSON(`/project/${projectId}/invites`)
}
