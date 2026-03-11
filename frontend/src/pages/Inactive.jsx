import React from 'react';
import InventoryBase from '../components/InventoryBase';

const Inactive = () => {
    return (
        <InventoryBase
            title="Inactive"
            description="Daftar aset dengan status Hilang"
            status="Hilang"
        />
    );
};

export default Inactive;
