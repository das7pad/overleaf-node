import { useCallback, useEffect } from 'react'
import { useFileTreeData } from '../../../shared/context/file-tree-data-context'
import { useFileTreeSelectable } from '../contexts/file-tree-selectable'
import { findInTreeOrThrow } from '../util/find-in-tree'
import { useIdeContext } from '../../../shared/context/ide-context'

export function useFileTreeSocketListener() {
  const {
    dispatchRename,
    dispatchDelete,
    dispatchMove,
    dispatchCreateFolder,
    dispatchCreateDoc,
    dispatchCreateFile,
    fileTreeData,
    updateProjectVersion,
  } = useFileTreeData()
  const { selectedEntityIds, selectedEntityParentIds, select, unselect } =
    useFileTreeSelectable()
  const ide = useIdeContext()
  const socket = ide.socket

  const handleReplacement = useCallback(
    (existingId, clientId) => {
      if (existingId !== '00000000-0000-0000-0000-000000000000') {
        dispatchDelete(existingId)
        unselect(existingId)
      }
      return (
        ide.$scope.openFile?.id === existingId ||
        ide.$scope.editor?.open_doc_id === existingId ||
        clientId === socket.publicId
      )
    },
    [ide, dispatchDelete, socket, unselect]
  )

  useEffect(() => {
    function handleDispatchRename({ entityId, name, projectVersion }) {
      updateProjectVersion(projectVersion)
      dispatchRename(entityId, name)
    }
    if (socket) socket.on('receiveEntityRename', handleDispatchRename)
    return () => {
      if (socket)
        socket.removeListener('receiveEntityRename', handleDispatchRename)
    }
  }, [socket, dispatchRename, updateProjectVersion])

  useEffect(() => {
    function handleDispatchDelete({ entityId, projectVersion }) {
      updateProjectVersion(projectVersion)
      unselect(entityId)
      if (selectedEntityParentIds.has(entityId)) {
        // we're deleting a folder with a selected children, so we need to
        // unselect its selected children first
        for (const selectedEntityId of selectedEntityIds) {
          if (
            findInTreeOrThrow(fileTreeData, selectedEntityId).path.includes(
              entityId
            )
          ) {
            unselect(selectedEntityId)
          }
        }
      }
      dispatchDelete(entityId)
    }
    if (socket) socket.on('removeEntity', handleDispatchDelete)
    return () => {
      if (socket) socket.removeListener('removeEntity', handleDispatchDelete)
    }
  }, [
    socket,
    unselect,
    dispatchDelete,
    fileTreeData,
    selectedEntityIds,
    selectedEntityParentIds,
    updateProjectVersion,
  ])

  useEffect(() => {
    function handleDispatchMove({ entityId, targetFolderId, projectVersion }) {
      updateProjectVersion(projectVersion)
      dispatchMove(entityId, targetFolderId)
    }
    if (socket) socket.on('receiveEntityMove', handleDispatchMove)
    return () => {
      if (socket) socket.removeListener('receiveEntityMove', handleDispatchMove)
    }
  }, [socket, dispatchMove, updateProjectVersion])

  useEffect(() => {
    function handleDispatchCreateFolder({
      parentFolderId,
      folder,
      projectVersion,
    }) {
      updateProjectVersion(projectVersion)
      dispatchCreateFolder(parentFolderId, folder)
    }
    if (socket) socket.on('receiveNewFolder', handleDispatchCreateFolder)
    return () => {
      if (socket)
        socket.removeListener('receiveNewFolder', handleDispatchCreateFolder)
    }
  }, [socket, dispatchCreateFolder, updateProjectVersion])

  useEffect(() => {
    function handleDispatchCreateDoc({
      parentFolderId,
      doc,
      projectVersion,
      existingId,
      clientId,
    }) {
      updateProjectVersion(projectVersion)
      const shouldSelect = handleReplacement(existingId, clientId)
      dispatchCreateDoc(parentFolderId, doc)
      if (shouldSelect) select(doc._id)
    }
    if (socket) socket.on('receiveNewDoc', handleDispatchCreateDoc)
    return () => {
      if (socket)
        socket.removeListener('receiveNewDoc', handleDispatchCreateDoc)
    }
  }, [
    socket,
    dispatchCreateDoc,
    updateProjectVersion,
    handleReplacement,
    select,
  ])

  useEffect(() => {
    function handleDispatchCreateFile({
      parentFolderId,
      file,
      projectVersion,
      existingId,
      clientId,
    }) {
      updateProjectVersion(projectVersion)
      const shouldSelect = handleReplacement(existingId, clientId)
      dispatchCreateFile(parentFolderId, file)
      if (shouldSelect) select(file._id)
    }
    if (socket) socket.on('receiveNewFile', handleDispatchCreateFile)
    return () => {
      if (socket)
        socket.removeListener('receiveNewFile', handleDispatchCreateFile)
    }
  }, [
    socket,
    dispatchCreateFile,
    select,
    handleReplacement,
    updateProjectVersion,
  ])
}
