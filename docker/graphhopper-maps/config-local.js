const origin = typeof window !== 'undefined' ? window.location.origin : ''

const config = {
    routingApi: origin + '/routing/',
    geocodingApi: origin + '/geocode/',
    defaultTiles: 'Local',
    keys: {
        graphhopper: '',
        maptiler: 'missing_api_key',
        omniscale: 'missing_api_key',
        thunderforest: 'missing_api_key',
        kurviger: 'missing_api_key',
        tracestrack: 'missing_api_key',
    },
    routingGraphLayerAllowed: false,
    request: {
        // must match the encoded_values actually enabled on the local GraphHopper instance (see /routing/info)
        details: ['road_class', 'road_environment', 'road_access', 'max_speed', 'country'],
    },
    profile_group_mapping: {},
}

if (typeof module !== 'undefined') module.exports = config
