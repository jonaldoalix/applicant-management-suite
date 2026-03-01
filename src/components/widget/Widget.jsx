/**
 * Generic Dashboard Widget
 * A reusable card component for displaying key metrics.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { KeyboardArrowUp as ArrowUp, KeyboardArrowDown as ArrowDown } from '@mui/icons-material';

// Context
import { useTheme } from '../../context/ThemeContext';

const WidgetIcon = ({ IconComponent, color }) => (
	<IconComponent
		className='icon'
		sx={{
			backgroundColor: color,
			color: 'custom.black',
			borderRadius: '8px',
			padding: '2px',
		}}
	/>
);

WidgetIcon.propTypes = {
	IconComponent: PropTypes.elementType.isRequired,
	color: PropTypes.string.isRequired,
};

const Widget = ({ title, linkText, link, IconComponent, color, isMoney = false, info }) => {
	const { boxShadow } = useTheme();
	const data = info || { amount: 'N/A', percent: 'N/A', gain: false };

	return (
		<Box flex={1} display='flex' flexDirection='column' justifyContent='space-between' padding={1} borderRadius='12px' boxShadow={boxShadow} bgcolor='background.paper' sx={{ maxHeight: '100px', minWidth: '180px' }} width='100%'>
			<Box display='flex' justifyContent='space-between' alignItems='center'>
				<Typography fontWeight='bold' fontSize='15px' color='text.secondary'>
					{title}
				</Typography>
				<Box display='flex' fontSize='12px' alignItems='center' borderRadius='15px' padding='0px 0px 0px 4px' bgcolor={data.gain ? 'custom.green' : 'custom.red'} color={data.gain ? 'text.light' : 'text.dark'}>
					{data.percent === 'N/A' ? '-' : `${data.percent}%`}
					{data.percent !== 'N/A' && (data.gain ? <ArrowUp fontSize='14px' /> : <ArrowDown fontSize='14px' />)}
				</Box>
			</Box>

			<Box>
				<Typography fontSize='28px' fontWeight='300' color='text.primary'>
					{isMoney ? `$${data.amount}` : data.amount}
				</Typography>
			</Box>

			<Box display='flex' justifyContent='space-between' alignItems='center'>
				<Link
					style={{
						fontSize: '12px',
						borderBottom: '1.5px solid',
						borderBottomColor: 'text.secondary',
						width: 'max-content',
						textDecoration: 'none',
						color: 'grey',
					}}
					to={link}>
					{linkText}
				</Link>
				<Box alignSelf='flex-end' display='flex' justifyContent='center' alignItems='flex-end' fontSize='18px' padding='5px' borderRadius='12px'>
					<WidgetIcon IconComponent={IconComponent} color={color} />
				</Box>
			</Box>
		</Box>
	);
};

Widget.propTypes = {
	title: PropTypes.string.isRequired,
	linkText: PropTypes.string.isRequired,
	link: PropTypes.string.isRequired,
	IconComponent: PropTypes.elementType.isRequired,
	color: PropTypes.string.isRequired,
	isMoney: PropTypes.bool,
	info: PropTypes.shape({
		amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		percent: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		gain: PropTypes.bool,
	}),
};

export default Widget;