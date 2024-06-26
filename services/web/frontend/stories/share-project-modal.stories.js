import { useEffect } from 'react'
import ShareProjectModal from '../js/features/share-project-modal/components/share-project-modal'
import useFetchMock from './hooks/use-fetch-mock'
import { useScope } from './hooks/use-scope'
import { ScopeDecorator } from './decorators/scope'
import { contacts } from './fixtures/contacts'
import { project } from './fixtures/project'

export const LinkSharingOff = args => {
  useFetchMock(setupFetchMock)

  useScope({
    project: {
      ...args.project,
      publicAccessLevel: 'private',
    },
  })

  return <ShareProjectModal {...args} />
}

export const LinkSharingOn = args => {
  useFetchMock(setupFetchMock)

  useScope({
    project: {
      ...args.project,
      publicAccessLevel: 'tokenBased',
    },
  })

  return <ShareProjectModal {...args} />
}

export const LinkSharingLoading = args => {
  useFetchMock(setupFetchMock)

  useScope({
    project: {
      ...args.project,
      publicAccessLevel: 'tokenBased',
      tokens: undefined,
    },
  })

  return <ShareProjectModal {...args} />
}

export const NonProjectOwnerLinkSharingOff = args => {
  useScope({
    project: {
      ...args.project,
      publicAccessLevel: 'private',
    },
  })

  return <ShareProjectModal {...args} />
}

export const NonProjectOwnerLinkSharingOn = args => {
  useScope({
    project: {
      ...args.project,
      publicAccessLevel: 'tokenBased',
    },
  })

  return <ShareProjectModal {...args} />
}

export const RestrictedTokenMember = args => {
  // Override isRestrictedTokenMember to be true, then revert it back to the
  // original value on unmount
  // Currently this is necessary because the context value is set from window,
  // however in the future we should change this to set via props
  useEffect(() => {
    const originalIsRestrictedTokenMember = window.isRestrictedTokenMember
    window.isRestrictedTokenMember = true
    return () => {
      window.isRestrictedTokenMember = originalIsRestrictedTokenMember
    }
  })

  useScope({
    project: {
      ...args.project,
      publicAccessLevel: 'tokenBased',
    },
  })

  return <ShareProjectModal {...args} />
}

export const LegacyLinkSharingReadAndWrite = args => {
  useFetchMock(setupFetchMock)

  useScope({
    project: {
      ...args.project,
      publicAccessLevel: 'readAndWrite',
    },
  })

  return <ShareProjectModal {...args} />
}

export const LegacyLinkSharingReadOnly = args => {
  useFetchMock(setupFetchMock)

  useScope({
    project: {
      ...args.project,
      publicAccessLevel: 'readOnly',
    },
  })

  return <ShareProjectModal {...args} />
}

export const LimitedCollaborators = args => {
  useFetchMock(setupFetchMock)

  useScope({
    project: {
      ...args.project,
      features: {
        ...args.project.features,
        collaborators: 3,
      },
    },
  })

  return <ShareProjectModal {...args} />
}

export default {
  title: 'Editor / Modals / Share Project',
  component: ShareProjectModal,
  args: {
    show: true,
    animation: false,
    user: {},
    project: {
      ...project,
      owner: {
        ...project.owner,
        _id: window.user.id,
      },
    },
  },
  argTypes: {
    handleHide: { action: 'hide' },
  },
  decorators: [ScopeDecorator],
}

function setupFetchMock(fetchMock) {
  const delay = 1000

  fetchMock
    // list contacts
    .get('express:/api/user/contacts', { contacts }, { delay })
    // change privacy setting
    .post(
      'express:/jwt/web/project/:projectId/settings/admin/publicAccessLevel',
      200,
      { delay }
    )
    // update project member (e.g. set privilege level)
    .put('express:/jwt/web/project/:projectId/users/:userId', 200, { delay })
    // remove project member
    .delete('express:/jwt/web/project/:projectId/users/:userId', 200, { delay })
    // transfer ownership
    .post('express:/jwt/web/project/:projectId/transfer-ownership', 200, {
      delay,
    })
    // send invite
    .post('express:/jwt/web/project/:projectId/invite', 200, { delay })
    // delete invite
    .delete('express:/jwt/web/project/:projectId/invite/:inviteId', 204, {
      delay,
    })
    // resend invite
    .post('express:/jwt/web/project/:projectId/invite/:inviteId/resend', 200, {
      delay,
    })
    // send analytics event
    .post('express:/event/:key', 200)
}
