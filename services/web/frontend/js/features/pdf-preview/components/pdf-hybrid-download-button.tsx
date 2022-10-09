import { useTranslation } from 'react-i18next'
import { Button } from 'react-bootstrap'
import Tooltip from '../../../shared/components/tooltip'
import Icon from '../../../shared/components/icon'
import { useDetachCompileContext as useCompileContext } from '../../../shared/context/detach-compile-context'
import { useProjectContext } from '../../../shared/context/project-context'

function PdfHybridDownloadButton() {
  const { name } = useProjectContext()
  const { pdfDownloadUrl } = useCompileContext()

  const { t } = useTranslation()
  const description = pdfDownloadUrl
    ? t('download_pdf')
    : t('please_compile_pdf_before_download')

  return (
    <Tooltip
      id="logs-toggle"
      description={description}
      overlayProps={{ placement: 'bottom' }}
    >
      <Button
        bsStyle="link"
        disabled={!pdfDownloadUrl}
        download={`${name}.pdf`}
        href={pdfDownloadUrl || '#'}
        target="_blank"
        style={{ pointerEvents: 'auto' }}
      >
        <Icon type="download" fw />
      </Button>
    </Tooltip>
  )
}

export default PdfHybridDownloadButton
