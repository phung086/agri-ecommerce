import axiosClient from "@/lib/axios-client";

const unwrapApiData = (response) => response?.data ?? response;

export const shippingAddressService = {
  getAddresses: async () => {
    const response = await axiosClient.get("/customer/shipping-addresses");
    return unwrapApiData(response);
  },

  createAddress: async (payload) => {
    const response = await axiosClient.post(
      "/customer/shipping-addresses",
      payload
    );
    return unwrapApiData(response);
  },

  updateAddress: async (addressId, payload) => {
    const response = await axiosClient.put(
      `/customer/shipping-addresses/${addressId}`,
      payload
    );
    return unwrapApiData(response);
  },

  setDefaultAddress: async (addressId) => {
    const response = await axiosClient.patch(
      `/customer/shipping-addresses/${addressId}/default`
    );
    return unwrapApiData(response);
  },

  deleteAddress: async (addressId) => {
    const response = await axiosClient.delete(
      `/customer/shipping-addresses/${addressId}`
    );
    return unwrapApiData(response);
  },
};
