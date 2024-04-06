import React, { useEffect, useState } from 'react';
import { map, find, get } from 'lodash';
import { AppBar, Box, Button, Container, Divider, FormControl, Grid, InputLabel, MenuItem, Select, Stack, Toolbar, Typography } from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { WebMidi } from "webmidi";
import firmwares from './firmwares';
import './App.css';
import logo from './shik-logo-small.png';
import { SEND_FIRMWARE_VERSION } from './commands';
import DialogBox from './components/DialogBox/DialogBox';

const Avrgirl = window.require('avrgirl-arduino');
const { SerialPort } = window.require('serialport');
const { ipcRenderer } = window.require('electron');

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
    ipcRenderer.on('resources-path', (event, path) => {
      setResourcesPath(path);
    });

    // Clean up the event listener when the component unmounts
    return () => {
      ipcRenderer.removeAllListeners('resources-path');
    };
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

  const vendorIds = ['2341', '1b4f', '1d50', '1D50'];

  // Find the port for Arduino Pro Micro to trigger reset
  async function findResetPort() {
    let resetPort;

    Avrgirl.list((err, ports) => {
      resetPort = ports.find((port) => vendorIds.find(vendorId => vendorId === port.vendorId));
      // resetPort = ports.find((port) => port.vendorId === '1d50' || port.vendorId === '1D50');
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (!resetPort) {
      throw new Error('Arduino Pro Micro reset port not found');
    }
    return resetPort.path;
  }

  // Find the port for Arduino to upload hex file
  async function findUploadPort() {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let uploadPort;
    Avrgirl.list((err, ports) => {
      uploadPort = ports.find((port) => vendorIds.find(vendorId => vendorId === port.vendorId));
      // uploadPort = ports.find((port) => port.vendorId === '1d50' || port.vendorId === '1D50' || port.vendorId === '2341');
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (uploadPort.length === 0) {
      throw new Error('Arduino upload port not found');
    }

    return uploadPort.path;
  }

  const handleUpload = async () => {
    setIsUploading(true);
    setAlertIndex(0);
    handleOpenModal();

    try {
      const resetPort = await findResetPort();
      // Trigger reset on Arduino Pro Micro
      const arduinoResetPort = new SerialPort({ path: resetPort, baudRate: 1200 });
      arduinoResetPort.on('open', () => {
        arduinoResetPort.close(async () => {
          const uploadPort = await findUploadPort();
          const avrgirl = new Avrgirl({
            board: 'micro',
            port: uploadPort,
            manualReset: true
          });
          const rootFolder = midiOutput.name === 'SHIK N32B V3' ? 'v3' : 'v2';
          const filePath = `${resourcesPath}/hexs/${rootFolder}/${selectedFile}`;

          await avrgirl.flash(filePath, (error) => {
            setIsUploading(false);

            if (error) {
              setAlertIndex(2);
              console.error(error);
            } else {
              setAlertIndex(1);
              console.log('Upload complete');
            }
          });
        });
      });
    } catch (error) {
      setIsUploading(false);
      setAlertIndex(2);
      console.error(error);
    }
  }

  return (
    <Container>
      <AppBar position='absolute'>
        <Toolbar variant="dense">
          <Stack direction="row" spacing={1}>
            <Stack
              direction="row"
              spacing={2}
              divider={<Divider orientation="vertical" />}
              sx={{ flexGrow: 1 }}
            >
              <Box
                component="img"
                alt="SHIK logo"
                src={logo}
                sx={{
                  height: 20,
                  pt: 1
                }}
              />
              <Typography sx={{ pt: 1 }} variant="body2" component="div">
                N32B Firmware updater
              </Typography>
            </Stack>
          </Stack>
        </Toolbar>
      </AppBar>

      <Grid
        container
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{ marginTop: 10 }}
      >
        {(deviceConnected || isUploading) && firmwareVersion && deviceFirmwareOptions &&
          <Stack
            direction="column"
            spacing={2}
          >
            <Typography>Detected {midiOutput.name}</Typography>
            <Typography>Your current firmware is: v{firmwareVersion.join('.')}</Typography>
            <Stack
              direction="row"
              spacing={2}
              divider={<Divider orientation="vertical" />}
              sx={{ flexGrow: 1 }}
            >
              <FormControl
              >
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

              <Divider orientation="vertical" variant="middle" flexItem />

              <Button
                onClick={handleUpload}
                variant='contained'
                endIcon={<UploadFileRoundedIcon />}
                disabled={isUploading}
              >
                Upload
              </Button>
            </Stack>
          </Stack>
        }

        {!deviceConnected && !isUploading &&
          <Typography>Please connect your N32B midi controller</Typography>
        }

        <DialogBox
          openModal={openModal}
          handleCloseModal={handleCloseModal}
          alertIndex={alertIndex}
          isUploading={isUploading}
        />

      </Grid>
    </Container>
  );
}

export default App;
