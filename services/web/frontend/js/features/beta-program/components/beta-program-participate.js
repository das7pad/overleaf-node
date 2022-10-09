import { useState } from 'react'
import {
  Alert,
  FormGroup,
  Button,
  Col,
  Row,
  PageHeader,
  Grid,
} from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import getMeta from '../../../utils/meta'
import { postJSON } from '../../../infrastructure/fetch-json'

const OPT_IN = true
const OPT_OUT = false

const REQUEST_IDLE = ''
const REQUEST_PENDING = 'pending'
const REQUEST_ERROR = 'error'

export default function BetaProgramParticipate() {
  const { t } = useTranslation()
  const [participates, setParticipates] = useState(
    getMeta('ol-participatesBetaProgram') ? OPT_IN : OPT_OUT
  )
  const [requestStatus, setRequestStatus] = useState(REQUEST_IDLE)

  function persistAction(action) {
    const url = action === OPT_IN ? '/api/beta/opt-in' : '/api/beta/opt-out'
    setRequestStatus(REQUEST_PENDING)
    postJSON(url)
      .then(() => {
        setParticipates(action)
        setRequestStatus(REQUEST_IDLE)
      })
      .catch(() => setRequestStatus(REQUEST_ERROR))
  }

  const participateStatus = participates ? (
    <>
      <p className="text-centered">
        {t('beta_program_already_participating')}.
      </p>
      <p>
        <Trans i18nKey="thank_you_for_being_part_of_our_beta_program">
          <strong />
        </Trans>
      </p>
    </>
  ) : (
    <>
      <p className="text-centered">{t('beta_program_not_participating')}.</p>
      <p>
        <Trans i18nKey="beta_program_benefits">
          <strong />
        </Trans>
      </p>
    </>
  )

  const howItWorks = (
    <>
      <p>
        <strong>How it works:</strong>
      </p>
      <ul>
        <li>
          {t('beta_program_badge_description')}
          <span
            aria-label={t('beta_feature_badge')}
            role="img"
            className="beta-feature-badge"
          />
        </li>
        <li>
          <Trans i18nKey="you_will_be_able_to_contact_us_any_time_to_share_your_feedback">
            <strong />
          </Trans>
        </li>
        <li>
          <Trans i18nKey="we_may_also_contact_you_from_time_to_time_by_email_with_a_survey">
            <strong />
          </Trans>
          .
        </li>
        <li>
          <Trans i18nKey="you_can_opt_in_and_out_of_the_program_at_any_time_on_this_page">
            <strong />
          </Trans>
        </li>
      </ul>
      <p>
        <Trans i18nKey="note_features_under_development">
          <strong />
        </Trans>
      </p>
    </>
  )

  function optIn(event) {
    event.stopPropagation()
    persistAction(OPT_IN)
  }
  function optOut(event) {
    event.stopPropagation()
    persistAction(OPT_OUT)
  }

  const cta = participates ? (
    <>
      <FormGroup>
        <Button
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          bsStyle="primary"
          bsSize="lg"
        >
          {t('give_feedback')}
        </Button>
      </FormGroup>
      <FormGroup>
        <Button
          type="submit"
          disabled={requestStatus === REQUEST_PENDING}
          bsStyle="info"
          bsSize="sm"
          onClick={optOut}
        >
          {t('beta_program_opt_out_action')}
        </Button>
      </FormGroup>
    </>
  ) : (
    <>
      <FormGroup>
        <Button
          type="submit"
          disabled={requestStatus === REQUEST_PENDING}
          bsStyle="primary"
          onClick={optIn}
        >
          {t('beta_program_opt_in_action')}
        </Button>
      </FormGroup>
    </>
  )

  const visualRequestStatus =
    requestStatus === REQUEST_ERROR ? (
      <Alert bsStyle="danger">{t('error_performing_request')}</Alert>
    ) : (
      <></>
    )

  const cardBody = (
    <>
      <Row>
        <Col md={12}>
          {participateStatus}
          {howItWorks}
        </Col>
      </Row>
      <Row className="text-centered">
        <Col md={12}>
          {cta}
          {visualRequestStatus}
          <FormGroup>
            <Button href="/project" bsStyle="link" bsSize="sm">
              {t('back_to_your_projects')}
            </Button>
          </FormGroup>
        </Col>
      </Row>
    </>
  )

  return (
    <Grid>
      <Row>
        <Col lg={8} lgOffset={2} md={10} mdOffset={1}>
          <div className="card">
            <PageHeader className="text-centered">
              <h1>{t('sharelatex_beta_program')}</h1>
            </PageHeader>
            <div className="beta-opt-in">
              <Grid fluid>{cardBody}</Grid>
            </div>
          </div>
        </Col>
      </Row>
    </Grid>
  )
}
