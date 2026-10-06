; FlowLuna Windows Setup NSIS Script
; Generated for FlowLuna C# .NET 9 + WebView2 Native Application

Unicode true
!define PRODUCT_NAME "FlowLuna"
!define PRODUCT_VERSION "1.2.0"
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
OutFile "release\FlowLuna-Setup-${PRODUCT_VERSION}.exe"
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

  ; Register File Types (ProgIDs)
  ; Audio ProgID: FlowLuna.AssocFile.Audio
  WriteRegStr HKCU "Software\Classes\FlowLuna.AssocFile.Audio" "" "Fichier Audio FlowLuna"
  WriteRegStr HKCU "Software\Classes\FlowLuna.AssocFile.Audio" "FriendlyTypeName" "Fichier Audio FlowLuna"
  WriteRegStr HKCU "Software\Classes\FlowLuna.AssocFile.Audio\DefaultIcon" "" "$INSTDIR\FlowLuna.exe,0"
  WriteRegStr HKCU "Software\Classes\FlowLuna.AssocFile.Audio\shell\open\command" "" '"$INSTDIR\FlowLuna.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\FlowLuna.AssocFile.Audio\shell\open" "FriendlyAppName" "FlowLuna"

  ; Video ProgID: FlowLuna.AssocFile.Video
  WriteRegStr HKCU "Software\Classes\FlowLuna.AssocFile.Video" "" "Fichier Vidéo FlowLuna"
  WriteRegStr HKCU "Software\Classes\FlowLuna.AssocFile.Video" "FriendlyTypeName" "Fichier Vidéo FlowLuna"
  WriteRegStr HKCU "Software\Classes\FlowLuna.AssocFile.Video\DefaultIcon" "" "$INSTDIR\FlowLuna.exe,0"
  WriteRegStr HKCU "Software\Classes\FlowLuna.AssocFile.Video\shell\open\command" "" '"$INSTDIR\FlowLuna.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\FlowLuna.AssocFile.Video\shell\open" "FriendlyAppName" "FlowLuna"

  ; Register Applications\FlowLuna.exe
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe" "FriendlyAppName" "FlowLuna"
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\DefaultIcon" "" "$INSTDIR\FlowLuna.exe,0"
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\shell\open\command" "" '"$INSTDIR\FlowLuna.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".mp3" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".flac" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".wav" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".m4a" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".ogg" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".aac" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".opus" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".wma" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".alac" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".aiff" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".mp4" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".mkv" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".webm" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".avi" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".mov" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".wmv" ""
  WriteRegStr HKCU "Software\Classes\Applications\FlowLuna.exe\SupportedTypes" ".flv" ""

  ; Register OpenWithProgids
  WriteRegStr HKCU "Software\Classes\.mp3\OpenWithProgids" "FlowLuna.AssocFile.Audio" ""
  WriteRegStr HKCU "Software\Classes\.flac\OpenWithProgids" "FlowLuna.AssocFile.Audio" ""
  WriteRegStr HKCU "Software\Classes\.wav\OpenWithProgids" "FlowLuna.AssocFile.Audio" ""
  WriteRegStr HKCU "Software\Classes\.m4a\OpenWithProgids" "FlowLuna.AssocFile.Audio" ""
  WriteRegStr HKCU "Software\Classes\.ogg\OpenWithProgids" "FlowLuna.AssocFile.Audio" ""
  WriteRegStr HKCU "Software\Classes\.aac\OpenWithProgids" "FlowLuna.AssocFile.Audio" ""
  WriteRegStr HKCU "Software\Classes\.opus\OpenWithProgids" "FlowLuna.AssocFile.Audio" ""
  WriteRegStr HKCU "Software\Classes\.wma\OpenWithProgids" "FlowLuna.AssocFile.Audio" ""
  WriteRegStr HKCU "Software\Classes\.alac\OpenWithProgids" "FlowLuna.AssocFile.Audio" ""
  WriteRegStr HKCU "Software\Classes\.aiff\OpenWithProgids" "FlowLuna.AssocFile.Audio" ""
  WriteRegStr HKCU "Software\Classes\.mp4\OpenWithProgids" "FlowLuna.AssocFile.Video" ""
  WriteRegStr HKCU "Software\Classes\.mkv\OpenWithProgids" "FlowLuna.AssocFile.Video" ""
  WriteRegStr HKCU "Software\Classes\.webm\OpenWithProgids" "FlowLuna.AssocFile.Video" ""
  WriteRegStr HKCU "Software\Classes\.avi\OpenWithProgids" "FlowLuna.AssocFile.Video" ""
  WriteRegStr HKCU "Software\Classes\.mov\OpenWithProgids" "FlowLuna.AssocFile.Video" ""
  WriteRegStr HKCU "Software\Classes\.wmv\OpenWithProgids" "FlowLuna.AssocFile.Video" ""
  WriteRegStr HKCU "Software\Classes\.flv\OpenWithProgids" "FlowLuna.AssocFile.Video" ""

  ; Windows Default Programs Capabilities Registration
  WriteRegStr HKCU "Software\FlowLuna\Capabilities" "ApplicationName" "FlowLuna"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities" "ApplicationDescription" "Lecteur Audio et Vidéo Moderne pour Windows"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities" "ApplicationIcon" "$INSTDIR\FlowLuna.exe,0"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".mp3" "FlowLuna.AssocFile.Audio"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".flac" "FlowLuna.AssocFile.Audio"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".wav" "FlowLuna.AssocFile.Audio"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".m4a" "FlowLuna.AssocFile.Audio"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".ogg" "FlowLuna.AssocFile.Audio"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".aac" "FlowLuna.AssocFile.Audio"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".opus" "FlowLuna.AssocFile.Audio"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".wma" "FlowLuna.AssocFile.Audio"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".alac" "FlowLuna.AssocFile.Audio"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".aiff" "FlowLuna.AssocFile.Audio"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".mp4" "FlowLuna.AssocFile.Video"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".mkv" "FlowLuna.AssocFile.Video"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".webm" "FlowLuna.AssocFile.Video"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".avi" "FlowLuna.AssocFile.Video"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".mov" "FlowLuna.AssocFile.Video"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".wmv" "FlowLuna.AssocFile.Video"
  WriteRegStr HKCU "Software\FlowLuna\Capabilities\FileAssociations" ".flv" "FlowLuna.AssocFile.Video"

  ; Register in Windows RegisteredApplications
  WriteRegStr HKCU "Software\RegisteredApplications" "FlowLuna" "Software\FlowLuna\Capabilities"

  ; Notify Windows Shell that file associations have changed
  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
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

  ; Clean file association registry
  DeleteRegValue HKCU "Software\RegisteredApplications" "FlowLuna"
  DeleteRegKey HKCU "Software\FlowLuna"
  DeleteRegKey HKCU "Software\Classes\FlowLuna.AssocFile.Audio"
  DeleteRegKey HKCU "Software\Classes\FlowLuna.AssocFile.Video"
  DeleteRegKey HKCU "Software\Classes\Applications\FlowLuna.exe"

  DeleteRegValue HKCU "Software\Classes\.mp3\OpenWithProgids" "FlowLuna.AssocFile.Audio"
  DeleteRegValue HKCU "Software\Classes\.flac\OpenWithProgids" "FlowLuna.AssocFile.Audio"
  DeleteRegValue HKCU "Software\Classes\.wav\OpenWithProgids" "FlowLuna.AssocFile.Audio"
  DeleteRegValue HKCU "Software\Classes\.m4a\OpenWithProgids" "FlowLuna.AssocFile.Audio"
  DeleteRegValue HKCU "Software\Classes\.ogg\OpenWithProgids" "FlowLuna.AssocFile.Audio"
  DeleteRegValue HKCU "Software\Classes\.aac\OpenWithProgids" "FlowLuna.AssocFile.Audio"
  DeleteRegValue HKCU "Software\Classes\.opus\OpenWithProgids" "FlowLuna.AssocFile.Audio"
  DeleteRegValue HKCU "Software\Classes\.wma\OpenWithProgids" "FlowLuna.AssocFile.Audio"
  DeleteRegValue HKCU "Software\Classes\.alac\OpenWithProgids" "FlowLuna.AssocFile.Audio"
  DeleteRegValue HKCU "Software\Classes\.aiff\OpenWithProgids" "FlowLuna.AssocFile.Audio"
  DeleteRegValue HKCU "Software\Classes\.mp4\OpenWithProgids" "FlowLuna.AssocFile.Video"
  DeleteRegValue HKCU "Software\Classes\.mkv\OpenWithProgids" "FlowLuna.AssocFile.Video"
  DeleteRegValue HKCU "Software\Classes\.webm\OpenWithProgids" "FlowLuna.AssocFile.Video"
  DeleteRegValue HKCU "Software\Classes\.avi\OpenWithProgids" "FlowLuna.AssocFile.Video"
  DeleteRegValue HKCU "Software\Classes\.mov\OpenWithProgids" "FlowLuna.AssocFile.Video"
  DeleteRegValue HKCU "Software\Classes\.wmv\OpenWithProgids" "FlowLuna.AssocFile.Video"
  DeleteRegValue HKCU "Software\Classes\.flv\OpenWithProgids" "FlowLuna.AssocFile.Video"

  ; Notify Windows Shell
  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'

  SetAutoClose true
SectionEnd
