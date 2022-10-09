import { useCallback, useEffect } from 'react'
import PropTypes from 'prop-types'

import { useUserContext } from '../../../shared/context/user-context'
import { useFileTreeData } from '../../../shared/context/file-tree-data-context'
import { useFileTreeSelectable } from '../contexts/file-tree-selectable'
import { findInTreeOrThrow } from '../util/find-in-tree'

export function useFileTreeSocketListener() {
  const user = useUserContext({
    id: PropTypes.string.isRequired,
  })
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
  const socket = window._ide && window._ide.socket

  const selectEntityIfCreatedByUser = useCallback(
    // hack to automatically re-open refreshed linked files
    (entityId, entityName, userId) => {
      // If the created entity's user exists and is the current user
      if (userId && user?.id === userId) {
        // And we're expecting a refreshed socket for this entity
        if (window.expectingLinkedFileRefreshedSocketFor === entityName) {
          // Then select it
          select(entityId)
          window.expectingLinkedFileRefreshedSocketFor = null
        }
      }
    },
    [user, select]
  )

  useEffect(() => {
    function handleDispatchRename(entityId, name, v) {
      updateProjectVersion(v)
      dispatchRename(entityId, name)
    }
    if (socket) socket.on('reciveEntityRename', handleDispatchRename)
    return () => {
      if (socket)
        socket.removeListener('reciveEntityRename', handleDispatchRename)
    }
  }, [socket, dispatchRename, updateProjectVersion])

  useEffect(() => {
    function handleDispatchDelete(entityId, _source, v) {
      updateProjectVersion(v)
      unselect(entityId)
      if (selectedEntityParentIds.has(entityId)) {
        // we're deleting a folder with a selected children so we need to
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
    function handleDispatchMove(entityId, toFolderId, v) {
      updateProjectVersion(v)
      dispatchMove(entityId, toFolderId)
    }
    if (socket) socket.on('reciveEntityMove', handleDispatchMove)
    return () => {
      if (socket) socket.removeListener('reciveEntityMove', handleDispatchMove)
    }
  }, [socket, dispatchMove, updateProjectVersion])

  useEffect(() => {
    function handleDispatchCreateFolder(parentFolderId, folder, v) {
      updateProjectVersion(v)
      dispatchCreateFolder(parentFolderId, folder)
    }
    if (socket) socket.on('reciveNewFolder', handleDispatchCreateFolder)
    return () => {
      if (socket)
        socket.removeListener('reciveNewFolder', handleDispatchCreateFolder)
    }
  }, [socket, dispatchCreateFolder, updateProjectVersion])

  useEffect(() => {
    function handleDispatchCreateDoc(parentFolderId, doc, v) {
      updateProjectVersion(v)
      dispatchCreateDoc(parentFolderId, doc)
    }
    if (socket) socket.on('reciveNewDoc', handleDispatchCreateDoc)
    return () => {
      if (socket) socket.removeListener('reciveNewDoc', handleDispatchCreateDoc)
    }
  }, [socket, dispatchCreateDoc, updateProjectVersion])

  useEffect(() => {
    function handleDispatchCreateFile(
      parentFolderId,
      file,
      _source,
      linkedFileData,
      userId,
      v
    ) {
      updateProjectVersion(v)
      dispatchCreateFile(parentFolderId, file)
      if (linkedFileData) {
        selectEntityIfCreatedByUser(file._id, file.name, userId)
      }
    }
    if (socket) socket.on('reciveNewFile', handleDispatchCreateFile)
    return () => {
      if (socket)
        socket.removeListener('reciveNewFile', handleDispatchCreateFile)
    }
  }, [
    socket,
    dispatchCreateFile,
    selectEntityIfCreatedByUser,
    updateProjectVersion,
  ])
}
