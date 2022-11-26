import { useState } from 'react'
import { Dropdown, MenuItem } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ExposedSettings } from '../../../../../types/exposed-settings'
import type { PortalTemplate } from '../../../../../types/portal-template'
import ControlledDropdown from '../../../shared/components/controlled-dropdown'
import getMeta from '../../../utils/meta'
import NewProjectButtonModal, {
  NewProjectButtonModalVariant,
} from './new-project-button/new-project-button-modal'
import { Nullable } from '../../../../../types/utils'

type NewProjectButtonProps = {
  id: string
  buttonText?: string
  className?: string
}

function NewProjectButton({
  id,
  buttonText,
  className,
}: NewProjectButtonProps) {
  const { t } = useTranslation()
  const { templateLinks } = getMeta('ol-ExposedSettings') as ExposedSettings
  const [modal, setModal] =
    useState<Nullable<NewProjectButtonModalVariant>>(null)
  const portalTemplates = getMeta('ol-portalTemplates') as PortalTemplate[]

  return (
    <>
      <ControlledDropdown id={id} className={className}>
        <Dropdown.Toggle
          noCaret
          className="new-project-button"
          bsStyle="primary"
        >
          {buttonText || t('new_project')}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <MenuItem onClick={() => setModal('blank_project')}>
            {t('blank_project')}
          </MenuItem>
          <MenuItem onClick={() => setModal('example_project')}>
            {t('example_project')}
          </MenuItem>
          <MenuItem onClick={() => setModal('upload_project')}>
            {t('upload_project')}
          </MenuItem>
          {portalTemplates?.length > 0 ? (
            <>
              <MenuItem divider />
              <MenuItem header>
                {`${t('institution')} ${t('templates')}`}
              </MenuItem>
              {portalTemplates.map((portalTemplate, index) => (
                <MenuItem
                  key={`portal-template-${index}`}
                  href={`${portalTemplate.url}#templates`}
                >
                  {portalTemplate.name}
                </MenuItem>
              ))}
            </>
          ) : null}
          {templateLinks.length > 0 && <MenuItem divider />}
          {templateLinks.length > 0 && (
            <MenuItem header>{t('templates')}</MenuItem>
          )}
          {templateLinks.map((templateLink, index) => (
            <MenuItem
              key={`new-project-button-template-${index}`}
              href={templateLink.url}
            >
              {templateLink.name === 'view_all'
                ? t('view_all')
                : templateLink.name}
            </MenuItem>
          ))}
        </Dropdown.Menu>
      </ControlledDropdown>
      <NewProjectButtonModal modal={modal} onHide={() => setModal(null)} />
    </>
  )
}

export default NewProjectButton
