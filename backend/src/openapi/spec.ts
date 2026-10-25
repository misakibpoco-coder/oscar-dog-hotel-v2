export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Oscar Dog Hotel Management REST API',
    version: '1.0.0',
    description: `
REST API contract for the Oscar Dog Hotel Android Application.
Provides authentication, dog profile management, booking scheduling with overlap protection, universal 6-status lifecycle management, overdue departure detection, phone-first owner matching, and backup telemetry.
    `,
    contact: {
      name: 'Oscar Dog Hotel Staff Administration',
      email: 'admin@oscardoghotel.com'
    }
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base Path'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT access token obtained from /api/v1/auth/login'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Input validation failed' },
              details: { type: 'object' }
            }
          }
        }
      },
      UniversalAvatar: {
        type: 'object',
        properties: {
          id: { type: 'string', enum: ['avatar_1', 'avatar_2', 'avatar_3', 'avatar_4', 'avatar_5'] },
          label: { type: 'string', example: 'Golden / Bruno' },
          breedTag: { type: 'string', example: 'Golden Retriever' },
          imageUrl: { type: 'string', example: '/assets/dog_avatar_1.png' }
        }
      },
      UniversalStatus: {
        type: 'object',
        properties: {
          id: { type: 'string', enum: ['RECEIVED', 'IN_HOTEL', 'UPCOMING', 'COMPLETE', 'CANCEL', 'OUTGOING'] },
          label: { type: 'string', enum: ['Received', 'In hotel', 'Upcoming', 'Complete', 'Cancel', 'Outgoing'] },
          color: { type: 'string', example: '#219763' },
          bgColor: { type: 'string', example: '#e0f7ec' },
          badgeColor: { type: 'string', example: '#219763' },
          icon: { type: 'string', example: '✓' }
        }
      },
      Owner: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'John Miller' },
          normalizedPhone: { type: 'string', example: '+35799123456' },
          displayPhone: { type: 'string', example: '+357 99 123456' },
          email: { type: 'string', format: 'email', example: 'john.miller@example.com' }
        }
      },
      Dog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Bruno' },
          breed: { type: 'string', example: 'Golden Retriever' },
          dateOfBirth: { type: 'string', format: 'date', example: '2023-05-10' },
          gender: { type: 'string', enum: ['Male', 'Female', 'Other'], example: 'Male' },
          weightKg: { type: 'number', example: 28.0 },
          avatarId: { type: 'string', enum: ['avatar_1', 'avatar_2', 'avatar_3', 'avatar_4', 'avatar_5'], example: 'avatar_1' },
          specialNotes: { type: 'string', example: 'Friendly golden retriever' },
          isArchived: { type: 'boolean', example: false },
          currentStatus: { type: 'string', example: 'In hotel' },
          owner: { $ref: '#/components/schemas/Owner' }
        }
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          dogId: { type: 'string', format: 'uuid' },
          dogName: { type: 'string', example: 'Bruno' },
          checkInAt: { type: 'string', format: 'date-time', example: '2026-09-12T07:15:00Z' },
          checkOutAt: { type: 'string', format: 'date-time', example: '2026-09-15T07:00:00Z' },
          checkInFormatted: { type: 'string', example: 'Sep 12, 2026' },
          checkInTimeFormatted: { type: 'string', example: '10:15 AM' },
          checkOutFormatted: { type: 'string', example: 'Sep 15, 2026' },
          checkOutTimeFormatted: { type: 'string', example: '10:00 AM' },
          currentStatus: { type: 'string', enum: ['RECEIVED', 'IN_HOTEL', 'UPCOMING', 'COMPLETE', 'CANCEL', 'OUTGOING'], example: 'IN_HOTEL' },
          services: { type: 'array', items: { type: 'string' }, example: ['bathing', 'extra_walks'] },
          durationNights: { type: 'integer', example: 3 },
          durationLabel: { type: 'string', example: '3 nights' },
          isOutgoingConfirmed: { type: 'boolean', example: false },
          attention: {
            type: 'object',
            properties: {
              requiresAttention: { type: 'boolean', example: false },
              attentionType: { type: 'string', enum: ['NONE', 'OUTGOING_CONFIRMATION_REQUIRED', 'OVERDUE_UNRESOLVED'] },
              isOverdue: { type: 'boolean', example: false },
              overdueMinutes: { type: 'integer', example: 0 }
            }
          }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Staff shared login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@oscardoghotel.com' },
                  password: { type: 'string', example: 'OscarHotel2026!' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Authenticated successfully' },
          401: { $ref: '#/components/schemas/ErrorResponse' }
        }
      }
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } }
              }
            }
          }
        },
        responses: {
          200: { description: 'Token refreshed' },
          401: { $ref: '#/components/schemas/ErrorResponse' }
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Staff logout',
        responses: { 200: { description: 'Logged out' } }
      }
    },
    '/auth/account': {
      get: {
        tags: ['Authentication'],
        summary: 'Get shared staff profile',
        responses: { 200: { description: 'Profile details' } }
      }
    },
    '/dogs': {
      get: {
        tags: ['Dogs'],
        summary: 'List dogs with search and status filtering',
        description: 'Searches strictly by dog name, owner name, or owner phone. Excludes archived dogs by default.',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search term for dog name, owner name, or owner phone' },
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by one of the 6 universal statuses' },
          { name: 'archived', in: 'query', schema: { type: 'string', enum: ['true', 'false'] }, description: 'Set to true to inspect archived profiles' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 25 } }
        ],
        responses: { 200: { description: 'Paginated dogs list' } }
      },
      post: {
        tags: ['Dogs'],
        summary: 'Create dog with atomic owner resolution',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'breed', 'gender', 'avatarId', 'ownerName', 'ownerPhone'],
                properties: {
                  name: { type: 'string', example: 'Bruno' },
                  breed: { type: 'string', example: 'Golden Retriever' },
                  dateOfBirth: { type: 'string', format: 'date', example: '2023-05-10' },
                  gender: { type: 'string', enum: ['Male', 'Female', 'Other'], example: 'Male' },
                  weightKg: { type: 'number', example: 28.0 },
                  avatarId: { type: 'string', enum: ['avatar_1', 'avatar_2', 'avatar_3', 'avatar_4', 'avatar_5'], example: 'avatar_1' },
                  specialNotes: { type: 'string', example: 'Friendly golden' },
                  ownerName: { type: 'string', example: 'John Miller' },
                  ownerPhone: { type: 'string', example: '+357 99 123456' },
                  ownerEmail: { type: 'string', format: 'email', example: 'john.miller@example.com' },
                  confirmExistingOwnerId: { type: 'string', format: 'uuid', description: 'Provide if confirming reuse despite name conflict' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Dog profile created' },
          409: { description: 'Owner phone conflict warning', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/dogs/{id}': {
      get: {
        tags: ['Dogs'],
        summary: 'Get dog details with relational owner and operational stay',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Dog details' }, 404: { $ref: '#/components/schemas/ErrorResponse' } }
      },
      patch: {
        tags: ['Dogs'],
        summary: 'Update dog profile',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Updated dog' } }
      }
    },
    '/dogs/{id}/archive': {
      post: {
        tags: ['Dogs'],
        summary: 'Archive dog profile (soft archive, blocks future bookings)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Archived successfully' } }
      }
    },
    '/dogs/{id}/restore': {
      post: {
        tags: ['Dogs'],
        summary: 'Restore archived dog profile',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Restored successfully' } }
      }
    },
    '/bookings': {
      get: {
        tags: ['Bookings'],
        summary: 'List bookings with status and date filters',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'dogId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'fromDate', in: 'query', schema: { type: 'string' } },
          { name: 'toDate', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Bookings list' } }
      },
      post: {
        tags: ['Bookings'],
        summary: 'Create booking with overlap and archive checks',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['dogId', 'checkInAt', 'checkOutAt'],
                properties: {
                  dogId: { type: 'string', format: 'uuid' },
                  checkInAt: { type: 'string', format: 'date-time' },
                  checkOutAt: { type: 'string', format: 'date-time' },
                  status: { type: 'string', enum: ['RECEIVED', 'IN_HOTEL', 'UPCOMING', 'COMPLETE', 'CANCEL', 'OUTGOING'], default: 'UPCOMING' },
                  services: { type: 'array', items: { type: 'string' } },
                  notes: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Booking created' },
          400: { description: 'Archived dog or invalid dates' },
          409: { description: 'Overlapping active booking for the same dog' }
        }
      }
    },
    '/bookings/{id}/extend': {
      post: {
        tags: ['Bookings'],
        summary: 'Extend existing booking in-place with overlap re-validation',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['newCheckOutAt'],
                properties: {
                  newCheckOutAt: { type: 'string', format: 'date-time' },
                  notes: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Booking extended' },
          409: { description: 'Extension causes overlap conflict' }
        }
      }
    },
    '/bookings/{id}/status': {
      post: {
        tags: ['Bookings'],
        summary: 'Transition booking status (requires effectiveAt date)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status', 'effectiveAt'],
                properties: {
                  status: { type: 'string', enum: ['RECEIVED', 'IN_HOTEL', 'UPCOMING', 'COMPLETE', 'CANCEL', 'OUTGOING'] },
                  effectiveAt: { type: 'string', format: 'date-time', description: 'Can be past, today, or future' },
                  notes: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Status updated and recorded in history' } }
      }
    },
    '/bookings/{id}/confirm-outgoing': {
      post: {
        tags: ['Bookings'],
        summary: 'Staff confirmation for departure when checkout time arrives',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Departure confirmed' } }
      }
    },
    '/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Real-time operational dashboard metrics and overdue alerts',
        responses: { 200: { description: 'Calculated metrics, overdue alerts, and today list' } }
      }
    },
    '/statuses': {
      get: {
        tags: ['Registries'],
        summary: 'Canonical six universal statuses',
        responses: { 200: { description: 'List of six universal statuses' } }
      }
    },
    '/avatars': {
      get: {
        tags: ['Registries'],
        summary: 'Canonical five universal dog avatars',
        responses: { 200: { description: 'List of five universal avatars' } }
      }
    },
    '/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Get application and shared account settings',
        responses: { 200: { description: 'Settings' } }
      },
      patch: {
        tags: ['Settings'],
        summary: 'Update settings',
        responses: { 200: { description: 'Updated settings' } }
      }
    },
    '/settings/export': {
      get: {
        tags: ['Settings'],
        summary: 'Download complete system backup JSON artifact',
        responses: { 200: { description: 'Backup file download' } }
      }
    },
    '/audit': {
      get: {
        tags: ['Audit'],
        summary: 'View paginated audit trail of entity mutations',
        responses: { 200: { description: 'Audit log entries' } }
      }
    },
    '/backups/status': {
      get: {
        tags: ['Backups'],
        summary: 'Observable backup health and telemetry',
        responses: { 200: { description: 'Backup status' } }
      }
    },
    '/backups/trigger': {
      post: {
        tags: ['Backups'],
        summary: 'Manually trigger encrypted database backup',
        responses: { 200: { description: 'Backup triggered and executed' } }
      }
    }
  }
};
