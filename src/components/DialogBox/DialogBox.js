import React from 'react';
import { Box, Button, Modal, Stack, Typography } from "@mui/material";

function DialogBox(props) {
    const {
        openModal,
        handleCloseModal,
        alertIndex,
        isUploading
    } = props;

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
    ];

    return (
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
    );
}

export default DialogBox;