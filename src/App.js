import React, { useState } from 'react';
import { map } from 'lodash';
import { AppBar, Box, Button, Container, Divider, FormControl, Grid, InputLabel, MenuItem, Select, Stack, Toolbar, Typography } from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import firmwares from './firmwares';
import './App.css';
import logo from './shik-logo-small.png';

const Avrgirl = window.require('avrgirl-arduino');
const { SerialPort } = window.require('serialport');

function App() {
  const [selectedFile, setSelectedFile] = useState(firmwares[0].value);

  const handleFirmwareSelect = (event) => {
    setSelectedFile(event.target.value);
  }

  // Find the port for Arduino Pro Micro to trigger reset
  async function findResetPort() {
    let resetPort;
    Avrgirl.list((err, ports) => {
      resetPort = ports.find((port) => {
        return port.vendorId === '1d50';
      });
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
      uploadPort = ports.find((port) => {
        return (port.vendorId === '1d50' && port.productId === '614f') ||
          (port.vendorId === '2341' && port.productId === '0036') ||
          port.vendorId === '2341';
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (uploadPort.length === 0) {
      throw new Error('Arduino upload port not found');
    }
    return uploadPort.path;
  }

  const handleUpload = async () => {
    const resetPort = await findResetPort();
    console.log(resetPort);
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
        const filePath = `public/hexs/${selectedFile}`
        avrgirl.flash(filePath, (error) => {
          if (error) {
            console.error(error);
          } else {
            console.log('Upload complete');
          }
        });
      });
    });
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
              >
                {map(firmwares, firmware => (
                  <MenuItem key={firmware.version} value={firmware.value}>{firmware.name} - {firmware.version}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              onClick={handleUpload}
              variant='contained'
              endIcon={<UploadFileRoundedIcon />}
            >
              Upload
            </Button>
          </Stack>
        </Stack>

      </Grid>
      {/* {uploading &&
        <div>Updating firmware...</div>
      }

      {errorMessage &&
        <div>Failed.</div>
      }

      {doneUploading &&
        <div>Done. Restarting the device.</div>
      } */}
    </Container>
  );
}

export default App;
