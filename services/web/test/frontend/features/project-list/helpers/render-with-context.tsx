import { render } from '@testing-library/react'
import fetchMock from 'fetch-mock'
import React from 'react'
import { ProjectListProvider } from '../../../../../frontend/js/features/project-list/context/project-list-context'
import { Project } from '../../../../../types/project/dashboard/api'
import { projectsData } from '../fixtures/projects-data'

type Options = {
  projects?: Project[]
}

export function renderWithProjectListContext(
  component: React.ReactElement,
  options: Options = {}
) {
  let { projects } = options

  if (!projects) {
    projects = projectsData
  }

  fetchMock.post('express:/api/project', {
    status: 200,
    body: { projects, totalSize: projects.length },
  })

  fetchMock.get('express:/jwt/web/system/messages', {
    status: 200,
    body: [],
  })

  const ProjectListProviderWrapper = ({
    children,
  }: {
    children: React.ReactNode
  }) => <ProjectListProvider>{children}</ProjectListProvider>

  return render(component, {
    wrapper: ProjectListProviderWrapper,
  })
}

export function resetProjectListContextFetch() {
  fetchMock.reset()
}
