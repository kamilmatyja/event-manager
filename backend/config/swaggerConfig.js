require('dotenv').config();

const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Event Manager API',
        version: '1.0.0',
        description: 'API documentation for the Event Management application.',
        contact: {
            name: 'Your Name / Team',

        },
        license: {
            name: 'ISC',

        }
    },
    servers: [
        {
            url: `http://localhost:${process.env.PORT || 3000}/api/v1`,
            description: 'Development server',
        },

    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter JWT token (don\'t include \'Bearer \' prefix here)'
            }
        },
        schemas: {

            UserBase: {
                type: 'object',
                properties: {
                    first_name: {type: 'string', example: 'Jan'},
                    last_name: {type: 'string', example: 'Kowalski'},
                    nick: {type: 'string', example: 'jankowalski'},
                    email: {type: 'string', format: 'email', example: 'jan.kowalski@example.com'},
                    role: {
                        type: 'integer',
                        enum: [1, 2, 3],
                        description: '1: Member, 2: Prelegent, 3: Administrator',
                        example: 1
                    },
                }
            },
            UserInput: {
                allOf: [
                    {$ref: '#/components/schemas/UserBase'},
                    {
                        type: 'object',
                        required: ['first_name', 'last_name', 'nick', 'email', 'password', 'role'],
                        properties: {
                            password: {type: 'string', format: 'password', example: 'strongPassword123'}
                        }
                    }
                ]
            },
            UserUpdate: {
                allOf: [
                    {$ref: '#/components/schemas/UserBase'},
                    {
                        type: 'object',
                        properties: {
                            password: {
                                type: 'string',
                                format: 'password',
                                description: 'Provide only if changing password',
                                example: 'newStrongPassword456'
                            }
                        }
                    }
                ]
            },
            UserOutput: {
                allOf: [
                    {$ref: '#/components/schemas/UserBase'},
                    {
                        type: 'object',
                        properties: {
                            id: {type: 'integer', example: 1},
                            created_at: {type: 'string', format: 'date-time'},
                            updated_at: {type: 'string', format: 'date-time'}
                        }
                    }
                ]
            },
            LoginCredentials: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: {type: 'string', format: 'email', example: 'admin@example.com'},
                    password: {type: 'string', format: 'password', example: 'adminpass'}
                }
            },
            LoginResponse: {
                type: 'object',
                properties: {
                    token: {type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'},
                    user: {$ref: '#/components/schemas/UserOutput'}
                }
            },
            RegisterInput: {
                type: 'object',
                required: ['first_name', 'last_name', 'nick', 'email', 'password'],
                properties: {
                    first_name: {type: 'string', example: 'Anna'},
                    last_name: {type: 'string', example: 'Nowak'},
                    nick: {type: 'string', example: 'annanowak'},
                    email: {type: 'string', format: 'email', example: 'anna.nowak@example.com'},
                    password: {type: 'string', format: 'password', example: 'password123'}
                }
            },
            LogOut: {
                type: 'object',
                properties: {
                    message: {type: 'string', example: 'Logout successful. Token has been revoked.'}
                }
            },

            Category: {
                type: 'object',
                properties: {
                    id: {type: 'integer', example: 1},
                    name: {type: 'string', example: 'Konferencja'},
                    description: {type: 'string', example: 'Wydarzenia o charakterze konferencyjnym.'},
                    created_at: {type: 'string', format: 'date-time'},
                    updated_at: {type: 'string', format: 'date-time'}
                }
            },
            CategoryInput: {
                type: 'object',
                required: ['name', 'description'],
                properties: {
                    name: {type: 'string', example: 'Warsztaty'},
                    description: {type: 'string', example: 'Interaktywne sesje praktyczne.'}
                }
            },

            Locale: {
                type: 'object',
                properties: {
                    id: {type: 'integer', example: 1},
                    city: {type: 'string', example: 'Warszawa'},
                    name: {type: 'string', example: 'Centrum Konferencyjne XYZ'},
                    created_at: {type: 'string', format: 'date-time'},
                    updated_at: {type: 'string', format: 'date-time'}
                }
            },
            LocaleInput: {
                type: 'object',
                required: ['city', 'name'],
                properties: {
                    city: {type: 'string', example: 'Kraków'},
                    name: {type: 'string', example: 'Aula Główna AGH'}
                }
            },

            Event: {
                type: 'object',
                properties: {
                    id: {type: 'integer', example: 1},
                    locale_id: {type: 'integer', example: 1},
                    category_id: {type: 'integer', example: 1},
                    name: {type: 'string', example: 'Node.js Summit 2024'},
                    description: {type: 'string', example: 'Największa konferencja Node.js w Polsce.'},
                    price: {type: 'number', format: 'float', example: 21.37},
                    started_at: {type: 'string', format: 'date-time', example: '2024-12-10T09:00:00Z'},
                    ended_at: {type: 'string', format: 'date-time', example: '2024-12-11T17:00:00Z'},
                    created_at: {type: 'string', format: 'date-time'},
                    updated_at: {type: 'string', format: 'date-time'},
                    prelegent_ids: {
                        type: 'array',
                        items: {type: 'integer'},
                        nullable: true,
                        example: [1, 2],
                        description: 'Array of Prelegent IDs'
                    },
                    resource_ids: {
                        type: 'array',
                        items: {type: 'integer'},
                        nullable: true,
                        example: [1, 2],
                        description: 'Array of Resource IDs'
                    },
                    sponsor_ids: {
                        type: 'array',
                        items: {type: 'integer'},
                        nullable: true,
                        example: [1, 2],
                        description: 'Array of Sponsor IDs'
                    },
                    catering_ids: {
                        type: 'array',
                        items: {type: 'integer'},
                        nullable: true,
                        example: [1, 2],
                        description: 'Array of Catering IDs'
                    },
                    ticket_count: {
                        type: 'integer',
                        description: 'Number of tickets registered for this event',
                        example: 2137
                    }
                }
            },
            EventInput: {
                type: 'object',
                required: ['locale_id', 'category_id', 'name', 'description', 'price', 'started_at', 'ended_at'],
                properties: {
                    locale_id: {type: 'integer', example: 1},
                    category_id: {type: 'integer', example: 1},
                    name: {type: 'string', example: 'React Universe'},
                    description: {type: 'string', example: 'Wszystko o ekosystemie React.'},
                    price: {type: 'number', format: 'float', example: 250.00},
                    started_at: {type: 'string', format: 'date-time', example: '2025-03-15T10:00:00Z'},
                    ended_at: {type: 'string', format: 'date-time', example: '2025-03-15T18:00:00Z'},
                    prelegent_ids: {
                        type: 'array',
                        items: {type: 'integer'},
                        nullable: true,
                        example: [1, 2],
                        description: 'Array of Prelegent IDs'
                    },
                    resource_ids: {
                        type: 'array',
                        items: {type: 'integer'},
                        nullable: true,
                        example: [1, 2],
                        description: 'Array of Resource IDs'
                    },
                    sponsor_ids: {
                        type: 'array',
                        items: {type: 'integer'},
                        nullable: true,
                        example: [1, 2],
                        description: 'Array of Sponsor IDs'
                    },
                    catering_ids: {
                        type: 'array',
                        items: {type: 'integer'},
                        nullable: true,
                        example: [1, 2],
                        description: 'Array of Catering IDs'
                    }
                }
            },

            EventTicket: {
                type: 'object',
                properties: {
                    id: {type: 'integer', example: 101},
                    event_id: {type: 'integer', example: 1},
                    user_id: {type: 'integer', example: 5},
                    price: {
                        type: 'number',
                        format: 'float',
                        example: 21.37,
                        description: 'Price at the time of purchase'
                    },
                    created_at: {type: 'string', format: 'date-time'},
                    updated_at: {type: 'string', format: 'date-time'}
                }
            },
            EventTicketInput: {
                type: 'object',
                required: ['event_id'],
                properties: {
                    event_id: {type: 'integer', example: 1}
                }
            },

            Prelegent: {
                type: 'object',
                properties: {
                    id: {type: 'integer', example: 1},
                    user_id: {type: 'integer', example: 2, description: 'Associated user ID'},
                    name: {type: 'string', example: 'Ekspert Node.js'},
                    description: {type: 'string', example: 'Doświadczony programista z 10-letnim stażem.'},
                    created_at: {type: 'string', format: 'date-time'},
                    updated_at: {type: 'string', format: 'date-time'}
                }
            },
            PrelegentInput: {
                type: 'object',
                required: ['user_id', 'name', 'description'],
                properties: {
                    user_id: {type: 'integer', example: 2},
                    name: {type: 'string', example: 'Specjalista React'},
                    description: {type: 'string', example: 'Autor popularnych bibliotek.'}
                }
            },

            Resource: {
                type: 'object',
                properties: {
                    id: {type: 'integer', example: 1},
                    name: {type: 'string', example: 'Projektor HD'},
                    description: {type: 'string', example: 'Projektor o wysokiej rozdzielczości do głównej sali.'},
                    created_at: {type: 'string', format: 'date-time'},
                    updated_at: {type: 'string', format: 'date-time'}
                }
            },
            ResourceInput: {
                type: 'object',
                required: ['name', 'description'],
                properties: {
                    name: {type: 'string', example: 'Flipchart'},
                    description: {type: 'string', example: 'Standardowy flipchart z markerami.'}
                }
            },

            Sponsor: {
                type: 'object',
                properties: {
                    id: {type: 'integer', example: 1},
                    name: {type: 'string', example: 'TechCorp'},
                    description: {type: 'string', example: 'Globalny lider technologii.'},
                    created_at: {type: 'string', format: 'date-time'},
                    updated_at: {type: 'string', format: 'date-time'}
                }
            },
            SponsorInput: {
                type: 'object',
                required: ['name', 'description'],
                properties: {
                    name: {type: 'string', example: 'StartupHub'},
                    description: {type: 'string', example: 'Wspieramy innowacje.'}
                }
            },

            Catering: {
                type: 'object',
                properties: {
                    id: {type: 'integer', example: 1},
                    name: {type: 'string', example: 'Smaczne Przerwy'},
                    description: {type: 'string', example: 'Pełna obsługa cateringowa konferencji.'},
                    created_at: {type: 'string', format: 'date-time'},
                    updated_at: {type: 'string', format: 'date-time'}
                }
            },
            CateringInput: {
                type: 'object',
                required: ['name', 'description'],
                properties: {
                    name: {type: 'string', example: 'Wege Raj'},
                    description: {type: 'string', example: 'Catering wegetariański i wegański.'}
                }
            },

            ErrorResponse: {
                type: 'object',
                properties: {
                    code: {type: 'integer', example: 409},
                    message: {type: 'string', example: 'Invalid credentials.'}
                }
            },
            ValidationErrorResponse: {
                type: 'object',
                properties: {
                    errors: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                type: {type: 'string', example: 'field'},
                                value: {type: 'string', example: 'emąil@wp.pl'},
                                msg: {type: 'string', example: 'Email is incorrect'},
                                path: {type: 'string', example: 'email'},
                                location: {type: 'string', example: 'body'}
                            }
                        }
                    }
                }
            },
        }
    },
    security: [],
};

const options = {
    swaggerDefinition,

    apis: ['./routes/*.js', './controllers/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;