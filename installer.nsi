; FlowLuna Windows Setup NSIS Script
; Generated for FlowLuna C# .NET 9 + WebView2 Native Application

Unicode true
!define PRODUCT_NAME "FlowLuna"
!define PRODUCT_VERSION "1.1.2"
!define PRODUCT_PUBLISHER "vortexazur"
!define PRODUCT_WEB_SITE "https://github.com/vortexazur/FlowLuna"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\FlowLuna.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKCU"

SetCompressor /SOLID lzma
SetCompressorDictSize 64
RequestExecutionLevel user

!include "MUI2.nsh"
!include "LogicLib.nsh"

; MUI Settings
!define MUI_ABORTWARNING
!define MUI_ICON "public\icon.ico"
!define MUI_UNICON "public\icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP_NOSTRETCH

; Welcome page
!insertmacro MUI_PAGE_WELCOME
; Directory page
!insertmacro MUI_PAGE_DIRECTORY
; Instfiles page
!insertmacro MUI_PAGE_INSTFILES
; Finish page
!define MUI_FINISHPAGE_RUN "$INSTDIR\FlowLuna.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Lancer FlowLuna"
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language files
!insertmacro MUI_LANGUAGE "French"
!insertmacro MUI_LANGUAGE "English"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "release\FlowLuna-Setup-1.1.2.exe"
InstallDir "$LOCALAPPDATA\Programs\FlowLuna"
InstallDirRegKey HKCU "${PRODUCT_DIR_REGKEY}" ""
ShowInstDetails show
ShowUnInstDetails show

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite try

  ; Kill any running FlowLuna instance before installing
  DetailPrint "Fermeture des instances en cours d'exécution..."
  nsExec::Exec 'taskkill /F /IM FlowLuna.exe'

  ; Copy all files from release-dotnet
  File /r "release-dotnet\*.*"

  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\FlowLuna"
  CreateShortcut "$SMPROGRAMS\FlowLuna\FlowLuna.lnk" "$INSTDIR\FlowLuna.exe" "" "$INSTDIR\FlowLuna.exe" 0
  CreateShortcut "$SMPROGRAMS\FlowLuna\Désinstaller FlowLuna.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\FlowLuna.lnk" "$INSTDIR\FlowLuna.exe" "" "$INSTDIR\FlowLuna.exe" 0
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\FlowLuna.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\FlowLuna.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegDWORD ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "NoModify" 1
  WriteRegDWORD ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "NoRepair" 1
SectionEnd

Function un.onUninstSuccess
  HideWindow
  MessageBox MB_ICONINFORMATION|MB_OK "$(^Name) a été désinstallé avec succès de votre ordinateur."
FunctionEnd

Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Êtes-vous sûr de vouloir désinstaller $(^Name) ?" IDYES +2
  Abort
FunctionEnd

Section Uninstall
  ; Kill running instance
  nsExec::Exec 'taskkill /F /IM FlowLuna.exe'

  ; Delete shortcuts
  Delete "$DESKTOP\FlowLuna.lnk"
  Delete "$SMPROGRAMS\FlowLuna\FlowLuna.lnk"
  Delete "$SMPROGRAMS\FlowLuna\Désinstaller FlowLuna.lnk"
  RMDir "$SMPROGRAMS\FlowLuna"

  ; Delete installed files
  RMDir /r "$INSTDIR\wwwroot"
  RMDir /r "$INSTDIR\runtimes"
  RMDir /r "$INSTDIR\bin"
  Delete "$INSTDIR\FlowLuna.exe"
  Delete "$INSTDIR\FlowLuna.pdb"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\*.xml"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"

  ; Clean registry
  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKCU "${PRODUCT_DIR_REGKEY}"
  SetAutoClose true
SectionEnd
