import React, { useEffect, useState, useCallback, useRef } from 'react';
import { find, get } from 'lodash';
import {
  Alert, AppBar, Box, Button, Card, CardContent, CardHeader, CssBaseline, FormControl, InputLabel, MenuItem, Select, Stack, Toolbar, Typography, Stepper, Step, StepLabel
} from '@mui/material';
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

const appVersion = require('../package.json').version;

const RotatingIcon = styled(RotateRightIcon)({
  '@keyframes rotateAnimation': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  animation: 'rotateAnimation 2s linear infinite',
});

const steps = ['Connect Device', 'Select Firmware', 'Upload'];

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

  // Stepper logic
  let activeStep = 0;
  if (deviceConnected) activeStep = 1;
  if (deviceConnected && selectedFile) activeStep = 2;
  if (uploadStatus === 'uploading') activeStep = 2;
  if (uploadStatus === 'success') activeStep = 2;

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column" bgcolor="background.default">
      <CssBaseline />
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box component="img" alt="SHIK logo" src={logo} sx={{ height: 20 }} />
          <Typography variant="body2" color="text.primary" fontWeight={500} letterSpacing={1}>
            N32B Firmware Updater
          </Typography>
        </Toolbar>
      </AppBar>
      <Box flex={1} display="flex" alignItems="center" justifyContent="center">
        <Card sx={{ minWidth: 350, maxWidth: 420, width: '100%', p: 2, boxShadow: 6 }}>
          <CardHeader
            title={<Stepper activeStep={activeStep} alternativeLabel>
              {steps.map(label => (
                <Step key={label}><StepLabel>{label}</StepLabel></Step>
              ))}
            </Stepper>}
            sx={{ pb: 0, background: 'none' }}
          />
          <CardContent>
            <Stack spacing={3} alignItems="center">
              {uploadStatus === 'error' && (
                <Alert severity="error" sx={{ width: '100%' }}>
                  Error updating firmware
                </Alert>
              )}
              {uploadStatus === 'success' && (
                <Alert severity="success" sx={{ width: '100%' }}>
                  Firmware updated successfully!
                </Alert>
              )}
              {!deviceConnected && uploadStatus === 'idle' && (
                <Alert severity="warning" sx={{ width: '100%' }}>
                  No device detected. Please connect your N32B MIDI controller.
                </Alert>
              )}
              {deviceConnected && firmwareVersion && (
                <Typography variant="body2" color="text.secondary">
                  Current firmware version: <b>v{firmwareVersion.join('.')}</b>
                </Typography>
              )}
              {deviceConnected && (
                <FormControl fullWidth>
                  <InputLabel id="firmware-select-label">Firmware</InputLabel>
                  <Select
                    labelId="firmware-select-label"
                    id="firmware-select"
                    value={selectedFile || ''}
                    label="Firmware"
                    onChange={handleFirmwareSelect}
                    disabled={uploadStatus === 'uploading'}
                  >
                    {deviceFirmwareOptions.map(firmware => (
                      <MenuItem key={firmware.version} value={firmware.value}>
                        {firmware.name} - v{firmware.version}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Button
                onClick={handleUpload}
                variant="contained"
                startIcon={uploadStatus === 'uploading' ? <RotatingIcon /> : <UploadFileRoundedIcon />}
                disabled={uploadStatus === 'uploading' || !isPortReady || !deviceConnected || !selectedFile}
                color="error"
                size="large"
                sx={{ width: '100%' }}
              >
                {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Firmware'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
      <Box component="footer" py={2} textAlign="center" color="text.secondary" fontSize={12}>
        &copy; {new Date().getFullYear()} SHIK. All rights reserved.<br />
        <span style={{ opacity: 0.7 }}>v{appVersion}</span>
      </Box>
      <DialogBox
        openModal={openModal}
        handleCloseModal={handleCloseModal}
        uploadStatus={uploadStatus}
      />
    </Box>
  );
}

export default App;
