import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
