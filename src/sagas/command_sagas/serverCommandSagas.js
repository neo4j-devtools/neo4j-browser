import { put, select, call } from 'redux-saga/effects'
import frames from '../../main/frames'
import settings from '../../settings'
import { getSettings } from '../../selectors'
import { splitStringOnFirst, splitStringOnLast } from '../../services/commandUtils'
import bolt from '../../services/bolt/bolt'
import { UserException } from '../../services/exceptions'

export function * handleServerCommand (cmd, cmdchar) {
  const [serverCmd, props] = splitStringOnFirst(splitStringOnFirst(cmd.substr(cmdchar.length), ' ')[1], ' ')
  if (serverCmd === 'add') {
    yield call(handleServerAddCommand, cmd, cmdchar)
    return
  }
  if (serverCmd === 'connect') {
    const connectionName = props
    const settingsState = yield select(getSettings)
    try {
      const connectionCreds = settingsState.bookmarks.filter((c) => c.name === connectionName)
      if (!connectionCreds) throw new UserException('No connection with the name ' + connectionName + ' found. Add a bookmark before trying to connect.')
      yield call(bolt.openConnection, connectionCreds[0])
    } catch (e) {
      yield put(frames.actions.add({cmd: cmd, errors: e, type: 'cmd'}))
    }
    return
  }
  yield put(frames.actions.add({cmd: cmd, type: 'unknown'}))
  return
}

export function * handleServerAddCommand (cmd, cmdchar) {
  // :server add name username:password@host:port
  const [serverCmd, props] = splitStringOnFirst(splitStringOnFirst(cmd.substr(cmdchar.length), ' ')[1], ' ')
  const [name, creds] = splitStringOnFirst(props, ' ')
  const [userCreds, host] = splitStringOnLast(creds, '@')
  const [username, password] = splitStringOnFirst(userCreds, ':')
  try {
    const errorMessage = 'Wrong format. It should be ":server add name username:password@host:port"'
    if (!serverCmd || !props) throw new UserException(errorMessage)
    if (!name || !creds) throw new UserException(errorMessage)
    if (!userCreds || !host) throw new UserException(errorMessage)
    if (!username || !password) throw new UserException(errorMessage)
  } catch (e) {
    yield put(frames.actions.add({cmd: cmd, errors: e, type: 'cmd'}))
    return
  }
  yield put(settings.actions.addServerBookmark({name, username, password, host}))
  const settingsState = yield select(getSettings)
  yield put(frames.actions.add({cmd: cmd, type: 'pre', contents: JSON.stringify(settingsState.bookmarks, null, 2)}))
}
