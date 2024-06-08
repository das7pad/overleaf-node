import { useTranslation } from 'react-i18next'
import { useEditorContext } from '../../../../shared/context/editor-context'
import SettingsMenuSelect from './settings-menu-select'
import { useProjectContext } from '../../../../shared/context/project-context'

export default function SettingsCompiler() {
  const { t } = useTranslation()
  const { permissionsLevel } = useEditorContext()
  const { editable } = useProjectContext()

  if (permissionsLevel === 'readOnly') {
    return null
  }

  return (
    <SettingsMenuSelect
      options={[
        {
          value: 'pdflatex',
          label: 'pdfLaTeX',
        },
        {
          value: 'latex',
          label: 'LaTeX',
        },
        {
          value: 'xelatex',
          label: 'XeLaTeX',
        },
        {
          value: 'lualatex',
          label: 'LuaLaTeX',
        },
      ]}
      label={t('compiler')}
      name="compiler"
      disabled={!editable}
    />
  )
}
