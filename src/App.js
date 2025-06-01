import React, { useEffect, useState } from 'react';
import { map, find, get } from 'lodash';
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
  const [isUploading, setIsUploading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [alertIndex, setAlertIndex] = useState(0);
  const [resourcesPath, setResourcesPath] = useState('');
  const [midiInput, setMidiInput] = useState(null);
  const [midiOutput, setMidiOutput] = useState(null);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [firmwareVersion, setFirmwareVersion] = useState(null);
  const [deviceFirmwareOptions, setDeviceFirmwareOptions] = useState([]);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => {
    setOpenModal(false);
    setIsUploading(false);
  };

  const handleFirmwareSelect = (event) => {
    setSelectedFile(event.target.value);
  }

  useEffect(() => {
    // Listen to the 'resources-path' event from the main process
    window.api.receive('fromMain', (data) => {
      if (data.type === 'resourcesPath') {
        setResourcesPath(data.path);
      }
    });

    // Request resources path from main process
    window.api.send('toMain', { type: 'getResourcesPath' });
  }, []);

  useEffect(() => {
    if (midiInput && midiOutput) {
      midiInput.addListener('sysex', handleFirmwareSysEx);
      midiOutput.sendSysex(32, [SEND_FIRMWARE_VERSION]);
      const firmwareIndex = midiOutput.name === 'SHIK N32B' ? 0 : 1;
      setDeviceFirmwareOptions(firmwares[firmwareIndex].firwmareOptions);
      setSelectedFile(firmwares[firmwareIndex].firwmareOptions[0].value);
    }
    return () => {
      if (midiInput) {
        midiInput.removeListener('sysex', handleFirmwareSysEx);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midiInput, midiOutput]);

  function handleFirmwareSysEx(e) {
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
  }

  WebMidi.addListener("connected", (event) => {
    const inputDevice = WebMidi.getInputByName("N32B");
    const outputDevice = WebMidi.getOutputByName("N32B");
    if (inputDevice && outputDevice && !midiInput && !midiOutput) {
      setMidiInput(inputDevice);
      setMidiOutput(outputDevice);
      setDeviceConnected(true);
    }
  });

  WebMidi.addListener("disconnected", (event) => {
    const result = find(event.port, el => get(el, 'name') === 'SHIK N32B' | get(el, 'name') === 'SHIK N32B V3');
    if (result) {
      setDeviceConnected(false);
      setFirmwareVersion(null);
      setMidiInput(null);
      setMidiOutput(null);
    }
  });

  WebMidi.enable({ sysex: true });

  const handleUpload = async () => {
    setIsUploading(true);
    setAlertIndex(0);
    handleOpenModal();

    try {
      // Request reset port from main process
      window.api.send('toMain', { type: 'findResetPort' });
      
      // Listen for reset port response
      window.api.receive('fromMain', async (data) => {
        if (data.type === 'resetPort') {
          const resetPort = data.data;
          
          // Request upload port
          window.api.send('toMain', { type: 'findUploadPort' });
          
          // Listen for upload port response
          window.api.receive('fromMain', async (data) => {
            if (data.type === 'uploadPort') {
              const uploadPort = data.data;
              const rootFolder = midiOutput.name === 'SHIK N32B V3' ? 'v3' : 'v2';
              const filePath = `${resourcesPath}/hexs/${rootFolder}/${selectedFile}`;
              
              // Request firmware upload
              window.api.send('toMain', { 
                type: 'uploadFirmware',
                filePath,
                uploadPort
              });
              
              // Listen for upload completion
              window.api.receive('fromMain', (data) => {
                if (data.type === 'uploadComplete') {
                  setIsUploading(false);
                  setAlertIndex(1);
                } else if (data.type === 'error') {
                  setIsUploading(false);
                  setAlertIndex(2);
                  console.error(data.error);
                }
              });
            }
          });
        }
      });
    } catch (error) {
      setIsUploading(false);
      setAlertIndex(2);
      console.error(error);
    }
  }

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
        {(deviceConnected || isUploading) && firmwareVersion && deviceFirmwareOptions &&
          <Stack
            direction="column"
            spacing={2}
          >
            <Alert severity="success">Connected to {midiOutput.name}</Alert>

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
                  disabled={isUploading}
                >
                  {map(deviceFirmwareOptions, firmware => (
                    <MenuItem key={firmware.version} value={firmware.value}>{firmware.name} - v{firmware.version}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                onClick={handleUpload}
                variant='contained'
                startIcon={<UploadFileRoundedIcon />}
                disabled={isUploading}
                color='error'
              >
                Upload
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

        {!deviceConnected && !isUploading &&
          <Alert severity="error">
            No device detected.
            <Typography>Please connect your N32B MIDI controller.</Typography>
          </Alert>
        }

        <DialogBox
          openModal={openModal}
          handleCloseModal={handleCloseModal}
          alertIndex={alertIndex}
          isUploading={isUploading}
        />
      </Box>
    </Box>
  );
}

export default App;
