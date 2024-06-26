import { Project } from '../../../types/project'

export const project: Project = {
  _id: 'a-project',
  name: 'A Project',
  features: {
    collaborators: -1, // unlimited
  },
  publicAccessLevel: 'private',
  tokens: {
    readOnly: 'ro-token',
    readAndWrite: 'rw-token',
  },
  owner: {
    _id: 'project-owner',
    email: 'stories@overleaf.com',
  },
  members: [
    {
      _id: 'viewer-member',
      type: 'user',
      privileges: 'readOnly',
      name: 'Viewer User',
      email: 'viewer@example.com',
    },
    {
      _id: 'author-member',
      type: 'user',
      privileges: 'readAndWrite',
      name: 'Author User',
      email: 'author@example.com',
    },
  ],
  invites: [
    {
      _id: 'test-invite-1',
      privileges: 'readOnly',
      name: 'Invited Viewer',
      email: 'invited-viewer@example.com',
    },
    {
      _id: 'test-invite-2',
      privileges: 'readAndWrite',
      name: 'Invited Author',
      email: 'invited-author@example.com',
    },
  ],
}
