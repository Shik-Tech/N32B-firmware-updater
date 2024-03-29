import React, { useEffect, useState } from 'react';
import { map, find } from 'lodash';
import { AppBar, Box, Button, Container, Divider, FormControl, Grid, InputLabel, MenuItem, Modal, Select, Stack, Toolbar, Typography } from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import firmwares from './firmwares';
import './App.css';
import logo from './shik-logo-small.png';

const Avrgirl = window.require('avrgirl-arduino');
const { SerialPort } = window.require('serialport');
const { ipcRenderer } = window.require('electron');

const modalBoxStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 300,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

function App() {
  const [selectedFile, setSelectedFile] = useState(firmwares[0].value);
  const [isUploading, setIsUploading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [alertIndex, setAlertIndex] = useState(0);
  const [resourcesPath, setResourcesPath] = useState('');

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

  const alertsMessages = [
    {
      title: 'Updating firmware',
      description: 'Please wait...'
    },
    {
      title: 'Done!',
      description: 'Enjoy your new firmware.'
    },
    {
      title: 'Something went wrong!',
      description: 'Please re-connect the device and try again. Contact our support if the issue continues.'
    }
  ]

  // Find the port for Arduino Pro Micro to trigger reset
  async function findResetPort() {
    let resetPort;

    Avrgirl.list((err, ports) => {
      resetPort = ports.find((port) => port.vendorId === '1d50' || port.vendorId === '1D50');
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
      uploadPort = ports.find((port) => port.vendorId === '1d50' || port.vendorId === '1D50' || port.vendorId === '2341');
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
          const filePath = `${resourcesPath}/hexs/${selectedFile}`;

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
              divider={<Divider orientation="vertical" light />}
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
        sx={{ marginTop: 17 }}
      >
        <Stack
          direction="column"
          spacing={2}
        >

          <Stack
            direction="row"
            spacing={2}
            divider={<Divider orientation="vertical" light />}
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
                {map(firmwares, firmware => (
                  <MenuItem key={firmware.version} value={firmware.value}>{firmware.name} - {firmware.version}</MenuItem>
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
          <Typography>
            Description: {find(firmwares, (firmware) => firmware.value === selectedFile).description}
          </Typography>
        </Stack>


        <Modal
          open={openModal}
          onClose={handleCloseModal}
          aria-labelledby="firmware-alerts"
          aria-describedby="firmware-alerts-description"
          disableEscapeKeyDown
          hideBackdrop
        >
          <Box sx={modalBoxStyle}>
            <Stack
              direction="column"
              spacing={2}
            >
              <Typography id="firmware-alerts" variant="h6" component="h2">
                {alertsMessages[alertIndex].title}
              </Typography>
              <Typography id="firmware-alerts-description" sx={{ mt: 2 }}>
                {alertsMessages[alertIndex].description}
              </Typography>

              {!isUploading &&
                <Button
                  onClick={handleCloseModal}
                >
                  Close
                </Button>
              }
            </Stack>
          </Box>
        </Modal>
      </Grid>
    </Container>
  );
}

export default App;
