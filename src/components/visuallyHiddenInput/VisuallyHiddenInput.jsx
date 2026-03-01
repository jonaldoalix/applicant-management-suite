/**
 * Visually Hidden Input
 * A styled component used to hide native input elements (like type="file")
 * while keeping them accessible to screen readers and keyboard navigation.
 * * Usage:
 * <Button component="label">
 * Upload File
 * <VisuallyHiddenInput type="file" onChange={...} />
 * </Button>
 */

import { styled } from '@mui/material/styles';

export const VisuallyHiddenInput = styled('input')({
	clip: 'rect(0 0 0 0)',
	clipPath: 'inset(50%)',
	height: 1,
	overflow: 'hidden',
	position: 'absolute',
	bottom: 0,
	left: 0,
	whiteSpace: 'nowrap',
	width: 1,
});