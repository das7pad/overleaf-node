import { useTranslation } from 'react-i18next'
import { useDetachCompileContext as useCompileContext } from '../../../shared/context/detach-compile-context'
import Icon from '../../../shared/components/icon'
import Tooltip from '../../../shared/components/tooltip'
import { useProjectContext } from '../../../shared/context/project-context'

export default function DownloadPDF() {
  const { t } = useTranslation()
  const { name } = useProjectContext()
  const { pdfDownloadUrl, pdfUrl } = useCompileContext()

  if (pdfUrl) {
    return (
      <a
        download={`${name}.pdf`}
        href={pdfDownloadUrl || pdfUrl}
        target="_blank"
        rel="noreferrer noopener"
      >
        <Icon type="file-pdf-o" modifier="2x" />
        <br />
        PDF
      </a>
    )
  } else {
    return (
      <Tooltip
        id="disabled-pdf-download"
        description={t('please_compile_pdf_before_download')}
        overlayProps={{ placement: 'bottom' }}
      >
        <div className="link-disabled">
          <Icon type="file-pdf-o" modifier="2x" />
          <br />
          PDF
        </div>
      </Tooltip>
    )
  }
}
