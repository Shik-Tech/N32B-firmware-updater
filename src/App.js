import React, { useEffect, useState, useCallback, useRef } from 'react';
import { find, get } from 'lodash';
import { Alert, AppBar, Box, Button, CssBaseline, Divider, FormControl, InputLabel, MenuItem, Select, Stack, Toolbar, Typography } from '@mui/material';
import {
  UploadFileRounded as UploadFileRoundedIcon,
  RotateRight as RotateRightIcon
} from '@mui/icons-material';
import { WebMidi } from "webmidi";
import firmwares from './firmwares';
import logo from './shik-logo-white.png';
import { SEND_FIRMWARE_VERSION } from './commands';
import DialogBox from './components/DialogBox/DialogBox';
import styled from '@emotion/styled';

const RotatingIcon = styled(RotateRightIcon)({
  '@keyframes rotateAnimation': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  animation: 'rotateAnimation 2s linear infinite',
});

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [resourcesPath, setResourcesPath] = useState('');
  const [midiInput, setMidiInput] = useState(null);
  const [midiOutput, setMidiOutput] = useState(null);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [firmwareVersion, setFirmwareVersion] = useState(null);
  const [deviceFirmwareOptions, setDeviceFirmwareOptions] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'uploading' | 'success' | 'error'
  const uploadResponseHandler = useRef(null);
  const [isPortReady, setIsPortReady] = useState(true);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => {
    setOpenModal(false);
    setUploadStatus('idle');
  };

  const handleFirmwareSelect = (event) => {
    setSelectedFile(event.target.value);
  }

  const handleFirmwareSysEx = useCallback((e) => {
    const {
      dataBytes,
      message: {
        manufacturerId
      }
    } = e;

    if (manufacturerId[0] === 32) {
      if (dataBytes[0] === SEND_FIRMWARE_VERSION && dataBytes.length > 2) {
        const firmwareVersion = dataBytes.slice(1);
        setFirmwareVersion(firmwareVersion);
      }
    }
  }, []);

  const setupDevice = useCallback((inputDevice, outputDevice) => {
    if (inputDevice && outputDevice) {
      setMidiInput(inputDevice);
      setMidiOutput(outputDevice);
      setDeviceConnected(true);
      inputDevice.addListener('sysex', handleFirmwareSysEx);
      outputDevice.sendSysex(32, [SEND_FIRMWARE_VERSION]);
      const firmwareIndex = outputDevice.name === 'SHIK N32B' ? 0 : 1;
      setDeviceFirmwareOptions(firmwares[firmwareIndex].firwmareOptions);
      setSelectedFile(firmwares[firmwareIndex].firwmareOptions[0].value);
    }
  }, [handleFirmwareSysEx]);

  useEffect(() => {
    // Listen to the 'resources-path' event from the main process
    const handleResourcesPath = (data) => {
      if (data.type === 'resourcesPath') {
        setResourcesPath(data.path);
      }
    };

    window.api.receive('fromMain', handleResourcesPath);
    window.api.send('toMain', { type: 'getResourcesPath' });

    // No cleanup needed for listeners handled by main process
  }, []);

  useEffect(() => {
    if (midiInput) {
      return () => {
        midiInput.removeListener('sysex', handleFirmwareSysEx);
      };
    }
  }, [midiInput, handleFirmwareSysEx]);

  useEffect(() => {
    const handleConnected = (event) => {
      const inputDevice = WebMidi.getInputByName("N32B");
      const outputDevice = WebMidi.getOutputByName("N32B");
      if (inputDevice && outputDevice && !midiInput && !midiOutput) {
        setupDevice(inputDevice, outputDevice);
      }
    };

    const handleDisconnected = (event) => {
      const result = find(event.port, el => get(el, 'name') === 'SHIK N32B' | get(el, 'name') === 'SHIK N32B V3');
      if (result) {
        setDeviceConnected(false);
        setFirmwareVersion(null);
        setMidiInput(null);
        setMidiOutput(null);
      }
    };

    WebMidi.addListener("connected", handleConnected);
    WebMidi.addListener("disconnected", handleDisconnected);
    WebMidi.enable({ sysex: true });

    return () => {
      WebMidi.removeListener("connected", handleConnected);
      WebMidi.removeListener("disconnected", handleDisconnected);
    };
  }, [midiInput, midiOutput, setupDevice]);

  const handleUpload = async () => {
    if (!isPortReady) {
      console.log('Port is not ready yet, please wait...');
      return;
    }

    setUploadStatus('uploading');
    setIsPortReady(false);
    handleOpenModal();

      try {
        // Clean up any existing handler
        if (uploadResponseHandler.current) {
          window.api.receive('fromMain', uploadResponseHandler.current);
          uploadResponseHandler.current = null;
        }

        // Set up a single handler for all responses
      const responseHandler = (data) => {
          switch (data.type) {
            case 'uploadComplete':
              setUploadStatus('success');
                  setIsPortReady(true);
              break;

            case 'error':
              setUploadStatus('error');
              setIsPortReady(true);
              console.error(data.error);
              break;

            default:
              break;
          }
        };

        // Store the handler reference
        uploadResponseHandler.current = responseHandler;
        
        // Set up the single handler
        window.api.receive('fromMain', responseHandler);
        
      // Request firmware upload
      const rootFolder = midiOutput.name === 'SHIK N32B V3' ? 'v3' : 'v2';
      const filePath = `${resourcesPath}/hexs/${rootFolder}/${selectedFile}`;
      window.api.send('toMain', { 
        type: 'uploadFirmware',
        filePath
      });
      } catch (error) {
        setUploadStatus('error');
        setIsPortReady(true);
        console.error(error);
      }
  }

  // Clean up upload handler when component unmounts
  useEffect(() => {
    return () => {
      if (uploadResponseHandler.current) {
        // The main process will handle cleanup of listeners
        uploadResponseHandler.current = null;
      }
    };
  }, []);

  return (
    <Box>
      <CssBaseline />
      <AppBar component="nav">
        <Toolbar>
          <Box
            component="img"
            alt="SHIK logo"
            src={logo}
            sx={{
              height: 20,
              pt: 1,
              mr: 2,
            }}
          />
          <Typography sx={{ pt: 1, flexGrow: 1 }} variant="body2" component="div">
            N32B Firmware updater
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ p: 3 }}>
        <Toolbar />
        {(deviceConnected || uploadStatus === 'uploading') && firmwareVersion && deviceFirmwareOptions &&
          <Stack
            direction="column"
            spacing={2}
          >
            <Alert severity={uploadStatus === 'error' ? 'error' : 'success'}>
              {uploadStatus === 'error' ? 'Error updating firmware' : `Connected to ${midiOutput.name}`}
            </Alert>

            <Typography
              sx={{
                p: 1
              }}
            >Your current firmware version is: v{firmwareVersion.join('.')}</Typography>
            <Divider />

            <Stack
              direction="row"
              justifyContent="center"
              spacing={2}
              sx={{
                pt: 2
              }}
            >
              <FormControl>
                <InputLabel id="firmware-select-label">Firmware</InputLabel>
                <Select
                  labelId="firmware-select-label"
                  id="firmware-select"
                  value={selectedFile}
                  label="Firmware"
                  onChange={handleFirmwareSelect}
                  disabled={uploadStatus === 'uploading'}
                >
                  {deviceFirmwareOptions.map(firmware => (
                    <MenuItem key={firmware.version} value={firmware.value}>{firmware.name} - v{firmware.version}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                onClick={handleUpload}
                variant='contained'
                startIcon={<UploadFileRoundedIcon />}
                disabled={uploadStatus === 'uploading' || !isPortReady}
                color={uploadStatus === 'error' ? 'error' : 'primary'}
              >
                {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload'}
              </Button>
            </Stack>
          </Stack>
        }

        {deviceConnected && !firmwareVersion &&
          <Alert severity='info' icon={<RotatingIcon />}>
            <Typography>
              Connecting to {midiOutput.name}...
            </Typography>
          </Alert>
        }

        {!deviceConnected && uploadStatus === 'idle' &&
          <Alert severity="error">
            No device detected.
            <Typography>Please connect your N32B MIDI controller.</Typography>
          </Alert>
        }

        <DialogBox
          openModal={openModal}
          handleCloseModal={handleCloseModal}
          uploadStatus={uploadStatus}
        />
      </Box>
    </Box>
  );
}

export default App;
