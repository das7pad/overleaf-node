import { Col, Row } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import NewProjectButton from './new-project-button'
import getMeta from '../../../utils/meta'
import { ExposedSettings } from '../../../../../types/exposed-settings'

export default function WelcomeMessage() {
  const { t } = useTranslation()

  const { templateLinks } = getMeta('ol-ExposedSettings') as ExposedSettings

  return (
    <div className="card card-thin">
      <div className="welcome text-centered">
        <h2>{t('welcome_to_sl')}</h2>
        <p>
          {t('new_to_latex_look_at')}&nbsp;
          {templateLinks.length > 0 && (
            <>
              <a href="/templates">{t('templates').toLowerCase()}</a>
              &nbsp;{t('or')}&nbsp;
            </>
          )}
          <a href="/learn">{t('latex_help_guide')}</a>
        </p>
        <Row>
          <Col md={4} mdOffset={4}>
            <div className="dropdown minimal-create-proj-dropdown">
              <NewProjectButton
                id="new-project-button-welcome"
                buttonText={t('create_first_project')}
              />
            </div>
          </Col>
        </Row>
      </div>
    </div>
  )
}
